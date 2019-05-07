import psycopg2
import pandas as pd
import pandas.io.sql as sqlio
import numpy as np
import bottle
import base64
from sqlalchemy import text
from base64 import b64decode
from json import loads, dumps
from whoosh.index import open_dir
from whoosh.fields import Schema, TEXT, ID
from whoosh.qparser import QueryParser
from bottle import route, run, request, response
from gensim.models import Word2Vec
from configparser import ConfigParser

# the decorator
def enable_cors(fn):
    def _enable_cors(*args, **kwargs):
        # set CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'

        if bottle.request.method != 'OPTIONS':
            # actual request; reply with the actual response
            return fn(*args, **kwargs)
    return _enable_cors

def get_model():
    model = Word2Vec.load("./model/vectors/word2vec.model")
    return model


@route("/similar", method="GET")
@enable_cors
def do_similarity():
    n = 10
    if "n" in request.query:
        n = request.query["n"]
    word_list = w2v.wv.most_similar(request.query["word"], topn=n)
    if word_list is None:
        word_list = []
    results = []
    for word in word_list:
        temp = {}
        temp["word"] = word[0]
        temp["score"] = str(word[1])
        results.append(temp)
    response.content_type = "application/json"
    return dumps(results)


@route("/predict", method="GET")
@enable_cors
def do_related():
    n = 10
    if "n" in request.query:
        n = request.query["n"]
    word_list = w2v.predict_output_word(request.query["context"].split(","), topn=n)
    if word_list is None:
        return dumps({})
    results = []
    for word in word_list:
        temp = {}
        temp["word"] = word[0]
        temp["score"] = str(word[1])
        results.append(temp)
    response.content_type = "application/json"
    return dumps(results)



@route("/search", method="GET")
@enable_cors
def do_search():
    # data = request.json
    # regex pattern: \bword1\W+(?:\w+\W+){0,2}?word2\b | need reverse words too
    # matches word1 near word2 with at most two words between them
    data = request.query
    q = qp.parse(data["word"])
    results = []
    with ix.searcher() as searcher:
        n = None
        if "limit" in data:
            n = int(data["limit"])
        hits = searcher.search(q, limit=n)
        for hit in hits:
            h = dict(hit)
            results.append({"0id":h["id"]})
        response.content_type = "application/json"
    return dumps(results)



@route("/process/signals", method="POST")
@enable_cors
def do_process_rules():
    data = loads(request.body.read())
    signals = data["signals"]
    query = data["query"]
    increment = data["increment"]
    loaded = data["loaded_articles"]
    df = citations
    signal_key = base64.b64encode(dumps(signals).encode())
    query_key = base64.b64encode(dumps(query).encode())
    ruleKey = str(increment).encode() + b"_" + signal_key + b"_" + query_key
    ruleHash = base64.b64encode(ruleKey).decode("utf-8");
    cache = run_query("select querydata from querycache where queryid=%s", data=(ruleHash,))
    if cache.shape[0] > 0:
        payload = base64.b64decode(cache["querydata"].values[0])
    else:
        if len(loaded) > 0:
            df = citations[citations["id"].isin(loaded)]
        # recursively get all counts for each signal>filter>restriction
        # this is easy because filters and restrictions have same structure :)
        processed = {}
        agg = Aggregator(increment)
        for id, signal in signals.items():
            df_signal = agg.aggregate_signals(df, signal)
            processed[id] = agg.aggregate_years(df_signal)
        # aggregate year data for front ui display
        # each year is json which has categories as keys, as well as a supplemental
        # total_value (array for each bin) and max_value (int)
        ui = {}
        for key in processed:
            for year in processed[key]:
                y_data = processed[key][year]
                cat_id = signals[key]["category"]
                if year not in ui:
                    ui[year] = { "total_value": [0]*int(100/increment)
                        , "max_value": 0 }
                if cat_id not in ui[year]:
                    ui[year][cat_id] = { "value": [0]*int(100/increment) }
                if y_data["max"] > ui[year]["max_value"]:
                    ui[year]["max_value"] = y_data["max"]
                for i in y_data["content"]:
                    ui[year][cat_id]["value"][int(i)] += y_data["content"][i]
                    ui[year]["total_value"][int(i)] += y_data["content"][i]
        payload = dumps({"front_data": ui, "signal_scores": agg.p})
        encoded = base64.b64encode(payload.encode()).decode("utf-8")
        run_update("insert into querycache(queryid, querydata) values(%s, %s)", data=(ruleHash, encoded))
    return payload


@route("/query", method=["POST"])
@enable_cors
def do_query():
    data = loads(request.body.read())
    query = data["query"]
    increment = data["increment"]
    agg = Aggregator(increment)
    left_bound = int(data["rangeLeft"])
    right_bound = int(data["rangeRight"])
    query = data["query"]
    query_key = base64.b64encode(dumps(query).encode())
    ruleKey = str(increment).encode() + b"_" + query_key
    ruleHash = base64.b64encode(ruleKey).decode("utf-8");
    cache = run_query("select querydata from querycache where queryid=%s", data=(ruleHash,))
    if cache.shape[0] > 0:
        # we have made this query before!
        payload = base64.b64decode(cache["querydata"].values[0])
    else:
        sql = main_query
        df = run_query(sql, data=(query,))
        df["id"] = np.arange(df.shape[0])

        df["leftdist"] = df["wordsentence"] - df["citationsentence"]
        df["rightdist"] = df["citationsentence"] - df["wordsentence"]
        df = df.query("(leftdist >= 0 and leftdist <= " + str(left_bound)
            + ") or (rightdist >= 0 and rightdist <= " + str(right_bound) + ")")
        sorted = agg.aggregate_years(df[["articleyear", "percent"]])
        payload = dumps({"agg":sorted, "nunique":df["id"].unique().tolist()})
        encoded = base64.b64encode(payload.encode()).decode("utf-8")
        run_update("insert into querycache(queryid, querydata) values(%s, %s)", data=(ruleHash, encoded))
    return payload


@route("/count", method=["POST"])
@enable_cors
def do_count():
    data = loads(request.body.read())
    increment = int(data["increment"])
    bins, labels = get_bins(increment)

    distribution = citations[["articleyear", "percent"]].copy(deep=True)
    agg = Aggregator(increment)
    sorted = agg.aggregate_years(distribution)
    return dumps({"agg":sorted, "nunique":citations["id"].unique().tolist()})


@route("/papers", method=["POST"])
@enable_cors
def do_papers():
    data = loads(request.body.read())
    query = data["query"]
    # now create a pandas query based off of the ranges
    filter = ""
    years = []
    range_list = data["selections"]
    last_rank = int(data["lastRank"])
    n_ranks = int(data["nrank"])
    for i, range in enumerate(range_list):
        if i > 0:
            filter += " or "
        r = range.split("-")
        if r[0] not in years:
            years.append(int(r[0]))
        filter += "(articleyear == " + r[0] + " and percent >= " + r[1] + " and percent <= " + r[2] + ")"

    if len(query) > 0:
        left_bound = int(data["rangeLeft"])
        right_bound = int(data["rangeRight"])
        sql = main_query
        # first filter by the query again.. this probably could be improved
        df = run_query(sql, data=(query,years))
    else:
        df = citations.copy(deep=True)

    increment = int(data["increment"])
    bins, labels = get_bins(increment)
    # now we can select our ranges and group by article
    df = df.query(filter)
    ref_count = df.groupby("articleid").size().reset_index(name="refcount")
    # get total amount of references per paper for ranking
    df = df.merge(ref_count, on="articleid", how="left")
    df["rank"] = df.groupby(["articleyear"])["refcount"].rank("dense", ascending=False)
    # filter for only top 5 results in each year
    df = df.query("rank>" + str(last_rank) + " and rank<=" + str(last_rank+5))
    df["bin"] = pd.cut(df["percent"], bins=bins, labels=labels)
    if len(query) > 0:
        df = df.merge(citations[["articleid", "journaltitle", "journalid"]], on="articleid", how="left")
    # get the size of each bin
    bin_size = df.groupby(["articleid","bin"]).size().reset_index(name="binsize")
    df = df.merge(bin_size, on=["articleid","bin"], how="left")
    # save max and list of years and journals for display
    max = df["refcount"].max().item()
    years = sorted(df["articleyear"].unique().tolist())
    journals = {}
    # transform data for consumption
    records = df.to_dict(orient="records")
    sorted_articles = {}
    for row in records:
        articleid = str(row["articleid"])
        if articleid not in sorted_articles:
            sorted_articles[articleid] = { "content": {}, "max": 0 }
            sorted_articles[articleid]["year"] = row["articleyear"]
            sorted_articles[articleid]["journalid"] = row["journalid"]
            sorted_articles[articleid]["total"] = row["refcount"]
            sorted_articles[articleid]["rank"] = row["rank"]
            for i in np.arange(100/int(increment)):
                sorted_articles[articleid]["content"][int(i)] = 0
        jid = str(row["journalid"])
        if jid not in journals:
            journals[jid] = {"title":row["journaltitle"], "years":[]}
        if row["articleyear"] not in journals[jid]["years"]:
            journals[jid]["years"].append(row["articleyear"])
        x = row["binsize"]
        sorted_articles[articleid]["content"][row["bin"]] = x
        if x > sorted_articles[articleid]["max"]:
            sorted_articles[articleid]["max"] = x
    return dumps({"max":max, "papers":sorted_articles, "years": years, "journals": journals})


@route("/paper", method="GET")
@enable_cors
def do_paper():
    article_id = request.query["id"]
    df = citations[citations["articleid"] == article_id]
    query = """select distinct id
        , startlocationpaper
        , endlocationpaper from paragraph
        where articleid_id=%s
        and ("""

    values = [article_id]
    df_text = run_query("""select id
        , papertext
        , charcount
        , articletitle
        , articleyear
        , journaltitle
        from article where id=%s""", tuple(values)).to_dict(orient="records")[0]
    locations = []
    added_first = False
    # collect the distinct paragraphs that we need that we can then use to chop
    # I guess there's an assumption here that our bounds stay within paragraphs
    for i, row in df.iterrows():
        location = (row["startlocationpaper"], row["endlocationpaper"])
        if location in locations:
            continue
        if added_first:
            query += " or "
        query += "(startlocationpaper <= %s and endlocationpaper >= %s)"
        values.append(row["startlocationpaper"])
        values.append(row["endlocationpaper"])
        locations.append(location)
        added_first = True
    query += """) order by startlocationpaper"""
    df_loc = run_query(query, tuple(values))

    # now that we have all the text that has citations, organize them and assign
    # citations to each based on location
    paragraphs = []
    for i, row in df_loc.iterrows():
        start = row["startlocationpaper"].item()
        end = row["endlocationpaper"].item()
        text = df_text["papertext"][start:end]
        cit = df.query("startlocationpaper >= " + str(start) + " and endlocationpaper <= " + str(end))
        temp = {
            "start": start
            , "end": end
            , "text": text
            , "citations": cit.to_dict(orient="records")
        }
        paragraphs.append(temp)
    del df_text["papertext"] # don't send the whole text over
    df_text["paragraphs"] = paragraphs
    return dumps(df_text)


## support postgres database stuff
def config(filename='./model/database.ini', section='postgresql'):
    # create a parser
    parser = ConfigParser()
    # read config file
    parser.read(filename)

    # get section, default to postgresql
    db = {}
    if parser.has_section(section):
        params = parser.items(section)
        for param in params:
            db[param[0]] = param[1]
    else:
        raise Exception('Section {0} not found in the {1} file'.format(section, filename))

    return db


def connect():
    """ Connect to the PostgreSQL database server """
    conn = None
    try:
        # read connection parameters
        params = config()
        # connect to the PostgreSQL server
        conn = psycopg2.connect(**params)
        conn.autocommit = True
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        return conn

def run_update(sql, data=()):
    try:
        # read database configuration
        params = config()
        # connect to the PostgreSQL database
        conn = psycopg2.connect(**params)
        # create a new cursor
        cur = conn.cursor()
        # execute the UPDATE  statement
        cur.execute(sql, data)
        # get the number of updated rows
        updated_rows = cur.rowcount
        # Commit the changes to the database
        conn.commit()
        # Close communication with the PostgreSQL database
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            conn.close()
    return updated_rows

def run_query(sql, data=(), is_update=False):
    results = pd.DataFrame()
    try:
        # read database configuration
        params = config()
        # connect to the PostgreSQL database
        conn = psycopg2.connect(**params)
        if is_update:
            # create a new cursor
            cur = conn.cursor()
            # execute the UPDATE  statement
            cur.execute(sql, data)
            # get the number of updated rows
            results = cur.fetchall()
            # Commit the changes to the database
            conn.commit()
            # Close communication with the PostgreSQL database
            cur.close()
        else:
            results = sqlio.read_sql_query(sql, conn, params=data)
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            conn.close()
    return results


def get_bins(increment):
    bins = [0]
    labels = []
    total = 0
    n = 0
    while total < 100:
        total += increment
        bins.append(total)
        labels.append(str(n))
        n += 1
    return bins, labels


class Aggregator():
    def __init__(self, _increment):
        self.increment = _increment
        self.p = {}

    def aggregate_signals(self, df, signal):
        id = str(signal["id"])
        w = signal["signal"]
        base = df[df["context"].str.contains(w)]
        if id not in self.p:
            agg = self.aggregate_years(base)
            self.p[id] = 0
            for key in agg:
                self.p[id] += agg[key]["total"]

        filtered = None
        for fid, filter in signal["filters"]:
            new_base = self.aggregate_signals(base, filter)
            if filtered is None:
                filtered = new_base
            else:
                filtered = pd.concat([filted, new_base]).drop_duplicates().reset_index(drop=True)

        if filtered is None:
            filtered = base
        for rid, restriction in signal["restrictions"]:
            new_base = self.aggregate_signals(base, restriction)
            filtered = filtered[~filtered.index.isin(new_base.index)]
        return filtered

    def aggregate_years(self, distribution):
        bins, labels = get_bins(self.increment)
        distribution["bin"] = pd.cut(distribution["percent"], bins=bins, labels=labels)
        distribution = distribution.groupby(["articleyear", "bin"]).size().reset_index(name="refcount")
        # distribution.fillna(0, inplace=True)
        distribution = distribution.to_dict(orient="records")
        sorted = {}
        for row in distribution:
            year = str(row["articleyear"])
            if year not in sorted:
                sorted[year] = { "content": {}, "max": 0, "total": 0 }
            x = row["refcount"]
            sorted[year]["content"][row["bin"]] = x
            sorted[year]["total"] += x
            if x > sorted[year]["max"]:
                sorted[year]["max"] = x
        return sorted


conn = connect()
# citations = pd.read_csv("./model/citation_percent.csv", encoding="utf-8")
citations = pd.read_pickle("./model/citation_context.pkl")
citations["id"] = np.arange(citations.shape[0])
# citations.rename(columns={"Unnamed: 0":"id"}, inplace=True)
# citations = pd.read_csv("./model/citations.csv", encoding="utf-8")
# articles = pd.read_csv("./model/articles.csv", encoding="utf-8")
# articles.rename(columns={ "id": "articleid" }, inplace=True)
articles = run_query("select id as articleid, journaltitle, journalid from article")
citations = citations.merge(articles[["articleid", "journaltitle", "journalid"]], on="articleid", how="left")
# citations["percent"] = (((citations["startlocationpaper"]+citations["endlocationpaper"])/2)/citations["charcount"])*100
# citations.to_csv("./model/citation_context.csv", encoding="utf-8")
# citations.to_pickle("./model/citation_context2.pkl")
w2v = get_model()
main_query = """
    select *
    , count(*) as count
    from (
        select wordSearch.articleid as articleID
            , wordSearch.articleyear
            , wordSearch.sentencenum as wordSentence
            , citationSearch.sentencenum as citationSentence
            , ((( CAST(wordSearch.startlocationpaper as float)
                +wordSearch.endlocationpaper)/2)
                /wordSearch.articleCharCount) * 100 as percent
        from wordsearch, citationsearch
        where wordsearch.articleid = citationsearch.articleid
        and wordSearch.lemma = ANY(%s) and wordSearch.articleYear = ANY(%s)
    ) as wordCitationJoin
    group by wordSentence, citationSentence, articleyear, articleid, percent
    order by articleyear
    """
# ix = open_dir(dirname="./model/index")
# searcher = ix.searcher()
# qp = QueryParser("content", schema=ix.schema)

run(host="localhost", port="5431", debug=True, threaded=True)
