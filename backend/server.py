import psycopg2
import pandas as pd
import pandas.io.sql as sqlio
import numpy as np
import base64
import os
import gzip
import pickle as pkl
from sqlalchemy import text
from base64 import b64decode
from json import loads, dumps
# from bottle import route, run, request, response
from flask import *
from flask_cors import CORS
from gensim.models import Word2Vec
from configparser import ConfigParser
from urllib.parse import urlparse,urlsplit
# from whoosh.index import open_dir
# from whoosh.fields import Schema, TEXT, ID
# from whoosh.qparser import QueryParser

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


def get_model():
    model = Word2Vec.load("./vectors/word2vec.model")
    return model


@app.route("/test", methods=["GET"])
def do_test():

    return dumps({})


@app.route("/similar", methods=["GET"])
def do_similarity():
    n = 10
    if "n" in request.args:
        n = request.args["n"]
    word_list = w2v.wv.most_similar(request.args["word"], topn=n)
    if word_list is None:
        word_list = []
    results = []
    for word in word_list:
        temp = {}
        temp["word"] = word[0]
        temp["score"] = str(word[1])
        results.append(temp)
    return jsonify(dumps(results))


@app.route("/predict", methods=["GET"])
def do_related():
    n = 10
    if "n" in request.args:
        n = request.args["n"]
    word_list = w2v.predict_output_word(
        request.args["context"].split(","), topn=n)
    if word_list is None:
        return dumps({})
    results = []
    for word in word_list:
        temp = {}
        temp["word"] = word[0]
        temp["score"] = str(word[1])
        results.append(temp)

    return jsonify(dumps(results))


@app.route("/search", methods=["GET"])
def do_search():
    # data = request.json
    # regex pattern: \bword1\W+(?:\w+\W+){0,2}?word2\b | need reverse words too
    # matches word1 near word2 with at most two words between them
    data = request.args
    q = qp.parse(data["word"])
    results = []
    with ix.searcher() as searcher:
        n = None
        if "limit" in data:
            n = int(data["limit"])
        hits = searcher.search(q, limit=n)
        for hit in hits:
            h = dict(hit)
            results.append({"0id": h["id"]})

    return jsonify(dumps(results))


@app.route("/process/signals", methods=["POST"])
def do_process_rules():
    data = request.get_json(force=True, silent=True)
    signals = data["signals"]
    query = data["query"]
    increment = data["increment"]
    # loaded = data["loaded_articles"]
    df = citations
    signal_key = base64.b64encode(dumps(signals).encode())
    query_key = base64.b64encode(dumps(query).encode())
    ruleKey = str(increment).encode() + b"_" + signal_key + b"_" + query_key
    ruleHash = base64.b64encode(ruleKey).decode("utf-8")
    cache = run_query(
        "select querydata from querycache where queryid=%s", data=(ruleHash,))
    if cache.shape[0] > 0:
        payload = loads(base64.b64decode(cache["querydata"].values[0]))
    else:
        if query != "" and query is not None:
            sql = main_query
            articles = run_query(sql, data=(query, all_years))
            df = citations[citations["articleid"].isin(articles["articleid"])]
        # recursively get all counts for each signal>filter>restriction
        # this is easy because filters and restrictions have same structure :)
        processed = {}
        agg = Aggregator(increment)
        for id, signal in signals.items():
            if signal["typeid"] > 1:
                continue
            df_signal = agg.aggregate_signals(df, signal, signals)
            processed[id] = agg.aggregate_years(df_signal)
        # aggregate year data for front ui display
        # each year is json which has categories as keys, as well as a supplemental
        # total_value (array for each bin) and max_value (int)
        ui = {}
        for key in processed:
            for year in processed[key]:
                y_data = processed[key][year]
                cat_id = signals[key]["category"]
                bins = int(100 / increment)
                if year not in ui:
                    ui[year] = {
                        "total_value": [0] * bins, "max_value": 0,
                        "papers": {"total_value": [0] * bins, "max_value": 0}
                    }

                if cat_id not in ui[year]:
                    ui[year][cat_id] = {"value": [0] * bins}
                    ui[year]["papers"][cat_id] = {"value": [0] * bins}

                if y_data["max"] > ui[year]["max_value"]:
                    ui[year]["max_value"] = y_data["max"]

                for i in y_data["content"]:
                    ui[year][cat_id]["value"][int(i)] += y_data["content"][i]
                    ui[year]["total_value"][int(i)] += y_data["content"][i]

                if y_data["papers"]["max"] > ui[year]["papers"]["max_value"]:
                    ui[year]["papers"]["max_value"] = y_data["papers"]["max"]

                for x in y_data["papers"]["content"]:
                    ui[year]["papers"][cat_id]["value"][int(
                        i)] += y_data["content"][i]
                    ui[year]["papers"]["total_value"][int(
                        i)] += y_data["content"][i]

        payload = {"front_data": ui, "signal_scores": agg.p}
        encoded = base64.b64encode(dumps(payload).encode()).decode("utf-8")
        run_update("insert into querycache(queryid, querydata) values(%s, %s)", data=(
            ruleHash, encoded))
    return jsonify(payload)


@app.route("/query", methods=["POST"])
def do_query():
    data = request.get_json(force=True, silent=True)
    query = data["query"]
    increment = data["increment"]
    agg = Aggregator(increment)
    left_bound = int(data["rangeLeft"])
    right_bound = int(data["rangeRight"])
    query = data["query"]
    query_key = base64.b64encode(dumps(query).encode())
    ruleKey = str(increment).encode() + b"_" + query_key
    ruleHash = base64.b64encode(ruleKey).decode("utf-8")
    cache = run_query(
        "select querydata from querycache where queryid=%s", data=(ruleHash,))
    if cache.shape[0] > 0:
        # we have made this query before!
        payload = loads(base64.b64decode(cache["querydata"].values[0]))
    else:
        if query == "":
            distribution = citations[[
                "articleyear", "percent", "articleid"]].copy(deep=True)
            agg = Aggregator(increment)
            sorted = agg.aggregate_years(distribution)
            payload = {"agg": sorted,
                       "nunique": citations["id"].unique().tolist()}
            encoded = base64.b64encode(dumps(payload).encode()).decode("utf-8")
        else:
            sql = main_query
            df = run_query(sql, data=(query, all_years))
            df["id"] = np.arange(df.shape[0])
            df["leftdist"] = df["wordsentence"] - df["citationsentence"]
            df["rightdist"] = df["citationsentence"] - df["wordsentence"]
            df = df.query("(leftdist >= 0 and leftdist <= " + str(left_bound)
                          + ") or (rightdist >= 0 and rightdist <= " + str(right_bound) + ")")
            sorted = agg.aggregate_years(
                df[["articleyear", "percent", "articleid"]])
            payload = {"agg": sorted, "nunique": df["id"].unique().tolist()}
            encoded = base64.b64encode(dumps(payload).encode()).decode("utf-8")
        run_update("insert into querycache(queryid, querydata) values(%s, %s)", data=(
            ruleHash, encoded))
    return jsonify(payload)


@app.route("/papers", methods=["POST"])
def do_papers():
    data = request.get_json(force=True, silent=True)
    query = data["query"]
    signals = data["signals"]
    # now create a pandas query based off of the ranges
    filter = ""
    years = []
    journal_id = data["journalid"]
    range_list = data["selections"]
    last_rank = int(data["lastRank"])
    n_ranks = int(data["nrank"])
    for i, range in enumerate(range_list):
        if i > 0:
            filter += " or "
        r = range.split("-")
        if r[0] not in years:
            years.append(int(r[0]))
        filter += "(articleyear == " + \
            r[0] + " and percent >= " + r[1] + " and percent <= " + r[2] + ")"

    if len(query) > 0:
        left_bound = int(data["rangeLeft"])
        right_bound = int(data["rangeRight"])
        sql = main_query
        # first filter by the query again.. this probably could be improved
        df = run_query(sql, data=(query, years))
    else:
        df = citations.copy(deep=True)

    increment = int(data["increment"])
    bins, labels = get_bins(increment)
    # now we can select our ranges and group by article
    df = df.query(filter)
    ref_count = df.groupby("articleid").size().reset_index(name="refcount")
    # merge in any additional columns we need for display/filtering
    if len(query) > 0:
        df = df.merge(citations[["articleid", "journaltitle",
                                 "journalid", "context"]], on="articleid", how="left")
    if journal_id != "":
        df = df[df["journalid"] == journal_id]
    # if we have signals associated to this query, filter
    if len(signals.items()) > 0:
        agg = Aggregator(increment)
        df_filtered = pd.DataFrame()
        for id, signal in signals.items():
            df_new = agg.aggregate_signals(df, signal, signals)
            df_filtered = pd.concat(
                [df_filtered, df_new]).drop_duplicates().reset_index(drop=True)
        df = df_filtered
    # get total amount of references per paper for ranking
    df = df.merge(ref_count, on="articleid", how="left")
    df["rank"] = df.groupby(["articleyear"])[
        "refcount"].rank("dense", ascending=False)
    # filter for only top 5 results in each year
    df = df.query("rank>" + str(last_rank) +
                  " and rank<=" + str(last_rank + 5))
    df["bin"] = pd.cut(df["percent"], bins=bins, labels=labels)
    # get the size of each bin
    bin_size = df.groupby(["articleid", "bin"]
                          ).size().reset_index(name="binsize")
    bin_size["bin"] = bin_size["bin"].astype("category")
    bin_size["articleid"] = bin_size["articleid"].astype("object")
    df = df.merge(bin_size, on=["articleid", "bin"], how="left")
    # save max and list of years and journals for display
    max = df["binsize"].max()
    if np.isnan(max):
        max = 1
    else:
        max = int(max)
    years = sorted(df["articleyear"].unique().tolist())
    journals = {}
    # transform data for consumption
    records = df.to_dict(orient="records")
    sorted_articles = {}
    for row in records:
        articleid = str(row["articleid"])
        if articleid not in sorted_articles:
            sorted_articles[articleid] = {"content": {}, "max": 0}
            sorted_articles[articleid]["year"] = row["articleyear"]
            sorted_articles[articleid]["journalid"] = row["journalid"]
            sorted_articles[articleid]["total"] = row["refcount"]
            sorted_articles[articleid]["rank"] = row["rank"]
            for i in np.arange(100 / int(increment)):
                sorted_articles[articleid]["content"][int(i)] = 0
        jid = str(row["journalid"])
        if jid not in journals:
            journals[jid] = {"title": row["journaltitle"], "years": []}
        if row["articleyear"] not in journals[jid]["years"]:
            journals[jid]["years"].append(row["articleyear"])
        x = row["binsize"]
        sorted_articles[articleid]["content"][row["bin"]] = x
        if x > sorted_articles[articleid]["max"]:
            sorted_articles[articleid]["max"] = x
    return jsonify(dumps({"max": max, "papers": sorted_articles, "years": years, "journals": journals}))


@app.route("/paper", methods=["GET"])
def do_paper():
    article_id = request.args["id"]
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
        cit = df.query("startlocationpaper >= " + str(start) +
                       " and endlocationpaper <= " + str(end))
        temp = {
            "start": start, "end": end, "text": text, "citations": cit.to_dict(orient="records")
        }
        paragraphs.append(temp)
    del df_text["papertext"]  # don't send the whole text over
    df_text["paragraphs"] = paragraphs
    return jsonify(dumps(df_text))


# support postgres database stuff
def config(filename='./database.ini', section='postgresql'):
    db = {}
    env = os.environ.get("DEPLOY_ENV")
    connstr = os.environ.get("DATABASE_URL")
    if env is None or env == "PROD":
        if connstr is None:
            raise Exception("DATABASE_URL was not provided")
        url =  urlparse(connstr)
        db["host"] = url.hostname
        db["port"] = url.port
        db["user"] = url.username
        db["password"] = url.password
        db["database"] = url.path[1:]
    else:
        # create a parser
        parser = ConfigParser()
        # read config file
        parser.read(filename)
        # get section, default to postgresql
        if parser.has_section(section):
            params = parser.items(section)
            for param in params:
                db[param[0]] = param[1]
        else:
            raise Exception(
                'Section {0} not found in the {1} file'.format(section, filename))

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

def load_zipped_pickle(filename):
    with gzip.open(filename, 'rb') as f:
        loaded_object = pkl.load(f)
        return loaded_object

class Aggregator():
    def __init__(self, _increment, ):
        self.increment = _increment
        self.p = {}

    def aggregate_signals(self, df, signal, signals):
        id = str(signal["id"])
        w = signal["signal"]
        base = df[df["context"].str.contains(w)]
        if id not in self.p:
            agg = self.aggregate_years(base)
            self.p[id] = 0
            for key in agg:
                self.p[id] += agg[key]["total"]

        filtered = None
        for fid in signal["filters"]:
            filter = signals[str(fid)]
            new_base = self.aggregate_signals(base, filter, signals)
            if filtered is None:
                filtered = new_base
            else:
                filtered = pd.concat(
                    [filted, new_base]).drop_duplicates().reset_index(drop=True)

        if filtered is None:
            filtered = base
        for rid in signal["restrictions"]:
            restriction = signals[str(rid)]
            new_base = self.aggregate_signals(base, restriction, signals)
            filtered = filtered[~filtered.index.isin(new_base.index)]
        return filtered

    def aggregate_years(self, distribution):
        bins, labels = get_bins(self.increment)
        distribution["bin"] = pd.cut(
            distribution["percent"], bins=bins, labels=labels)
        distribution = distribution.groupby(
            ["articleyear", "bin"], as_index=False).agg({
                "articleid": ["size", "nunique"]
            })
        distribution.columns = list(map("_".join, distribution.columns.values))
        # distribution.fillna(0, inplace=True)
        distribution = distribution.to_dict(orient="records")
        sorted = {}
        for row in distribution:
            year = str(row["articleyear_"])
            if year not in sorted:
                sorted[year] = {
                    "content": {},
                    "max": 0,
                    "total": 0,
                    "papers": {
                        "content": {},
                        "max": 0,
                        "total": 0
                    }}

            x = row["articleid_size"]
            sorted[year]["content"][row["bin_"]] = x
            sorted[year]["total"] += x
            if x > sorted[year]["max"]:
                sorted[year]["max"] = x

            y = row["articleid_nunique"]
            sorted[year]["papers"]["content"][row["bin_"]] = y
            sorted[year]["papers"]["total"] += y
            if y > sorted[year]["papers"]["max"]:
                sorted[year]["papers"]["max"] = y
        return sorted


# load the connection to the db
conn = connect()
# load the word2vec model
w2v = get_model()
# citations = pd.read_csv("./model/citation_percent.csv", encoding="utf-8")
citations = load_zipped_pickle("./vectors/citations_optimized.gzip")
# with gzip.open("citations_optimized.gzip", 'wb') as f:
#     pkl.dump(citations, f, -1)
# print("done")
citations["id"] = np.arange(citations.shape[0])
# citations.rename(columns={"Unnamed: 0":"id"}, inplace=True)
# citations = pd.read_csv("./citations.csv", encoding="utf-8")
# articles = pd.read_csv("./articles.csv", encoding="utf-8")
# articles.rename(columns={ "id": "articleid" }, inplace=True)
# citations["percent"] = (((citations["startlocationpaper"]+citations["endlocationpaper"])/2)/citations["charcount"])*100

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
all_years = citations["articleyear"].unique().tolist()
# ix = open_dir(dirname="./model/index")
# searcher = ix.searcher()
# qp = QueryParser("content", schema=ix.schema)

if __name__ == "__main__":
    sess.init_app(app)
    app.run(debug=True, threaded=True)
