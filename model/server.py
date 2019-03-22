from base64 import b64decode
from json import loads, dumps
from whoosh.index import open_dir
from whoosh.fields import Schema, TEXT, ID
from whoosh.qparser import QueryParser
from bottle import route, run, request, response
from gensim.models import Word2Vec

def get_model():
    model = Word2Vec.load("./vectors/word2vec.model")
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
    with ix.searcher() as searcher:
        hits = searcher.search(q)
        for hit in hits:
            h = dict(hit)
            results.append({"id":h["id"]})
    response.content_type = "application/json"
    return dumps(results)

w2v = get_model()
ix = open_dir(dirname="./index")
qp = QueryParser("content", schema=ix.schema)

run(host="localhost", port="5431", debug=True)
