import psycopg2
from base64 import b64decode
from json import loads, dumps
from whoosh.index import open_dir
from whoosh.fields import Schema, TEXT, ID
from whoosh.qparser import QueryParser
from bottle import route, run, request, response
from gensim.models import Word2Vec

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

def config(filename='database.ini', section='postgresql'):
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

def run_query(sql, data=()):
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
        results = cur.fetchall()
        # Commit the changes to the database
        conn.commit()
        # Close communication with the PostgreSQL database
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            conn.close()
    return results


conn = connect()
w2v = get_model()
ix = open_dir(dirname="./model/index")
searcher = ix.searcher()
qp = QueryParser("content", schema=ix.schema)

run(host="localhost", port="5431", debug=True, threaded=True)
