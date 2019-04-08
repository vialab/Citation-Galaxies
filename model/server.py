import psycopg2
import pandas as pd
import pandas.io.sql as sqlio
import numpy as np
import bottle
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

@route("/similarity", method="GET")
def do_similarity():
    word_list = w2v.wv.most_similar(request.query["word"])
    results = []
    for word in word_list:
        temp = {}
        temp["word"] = word[0]
        temp["score"] = str(word[1])
        results.append(temp)
    response.content_type = "application/json"
    return dumps(results)


@route("/search", method="GET")
def do_search():
    # data = request.json
    data = request.query
    q = qp.parse(data["word"])

    results = []
    # with ix.searcher() as searcher:
    n = None
    if "limit" in data:
        n = int(data["limit"])
    hits = searcher.search(q, limit=n)
    for hit in hits:
        h = dict(hit)
        results.append({"id":h["id"]})
    response.content_type = "application/json"
    return dumps(results)


@route("/query", method=["POST"])
@enable_cors
def do_query():
    data = loads(request.body.read())
    query = data["query"]
    sql = """select *, count(*) as count from (
        		select wordSearch.articleid as articleID
                    , wordSearch.articleyear
        			, wordSearch.sentencenum as wordSentence
        			, citationSearch.sentencenum as citationSentence
        			, ((( CAST(wordSearch.startlocationpaper as float)
        				+wordSearch.endlocationpaper)/2)
        				/wordSearch.articleCharCount) * 100 as percent
        		from wordsearch, citationsearch
        		where wordsearch.articleid = citationsearch.articleid
                and wordSearch.lemma = ANY(%s)
            ) as wordCitationJoin
            group by wordSentence, citationSentence, articleyear, articleid, percent
            order by wordCitationJoin.articleid
	"""
    df = run_query(sql, data=(query,))
    bins = [0]
    labels = []
    increment = int(data["increment"])
    total = 0
    n = 0
    while total < 100:
        total += increment
        bins.append(total)
        labels.append(str(n))
        n += 1

    distribution = df[["articleyear", "percent"]]
    distribution["bin"] = pd.cut(df["percent"], bins=bins, labels=labels)
    distribution = distribution.groupby(["articleyear", "bin"]).count()
    distribution.fillna(0, inplace=True)
    distribution = distribution.to_dict()

    sorted = {}
    for key in distribution["percent"]:
        year = str(key[0])
        if year not in sorted:
            sorted[year] = { "content": {}, "max": 0 }
        x = distribution["percent"][key]
        sorted[year]["content"][str(key[1])] = x
        if x > sorted[year]["max"]:
            sorted[year]["max"] = x

    return dumps(sorted)



@route("/count", method=["POST"])
@enable_cors
def do_count():
    data = loads(request.body.read())
    bins = [0]
    labels = []
    increment = int(data["increment"])
    total = 0
    n = 0
    while total < 100:
        total += increment
        bins.append(total)
        labels.append(str(n))
        n += 1

    distribution = citations[["articleyear", "percent"]].copy(deep=True)
    distribution["bin"] = pd.cut(distribution["percent"], bins=bins, labels=labels)
    distribution = distribution.groupby(["articleyear", "bin"]).count()
    distribution = distribution.to_dict()
    sorted = {}
    for key in distribution["percent"]:
        year = str(key[0])
        if year not in sorted:
            sorted[year] = { "content": {}, "max": 0 }
        x = distribution["percent"][key]
        sorted[year]["content"][str(key[1])] = x
        if x > sorted[year]["max"]:
            sorted[year]["max"] = x

    return dumps(sorted)


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


conn = connect()
citations = pd.read_csv("./model/citation_percent.csv", encoding="utf-8")
# citations = pd.read_csv("./model/citations.csv", encoding="utf-8")
# articles = pd.read_csv("./model/articles.csv", encoding="utf-8")
# articles.rename(columns={ "id": "articleid" }, inplace=True)
# citations = citations.merge(articles[["articleid", "charcount"]], on="articleid", how="left")
# citations["percent"] = (((citations["startlocationpaper"]+citations["endlocationpaper"])/2)/citations["charcount"])*100
# citations.to_csv("./model/citation_percent.csv", encoding="utf-8")
w2v = get_model()
# ix = open_dir(dirname="./model/index")
# searcher = ix.searcher()
# qp = QueryParser("content", schema=ix.schema)

run(host="localhost", port="5431", debug=True, threaded=True)
