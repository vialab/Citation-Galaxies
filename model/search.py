from sys import argv
from base64 import b64decode
from json import loads, dumps
from whoosh.index import open_dir
from whoosh.fields import Schema, TEXT, ID
from whoosh.qparser import QueryParser

def decodeInput():
    decoded = b64decode(argv[1])
    try:
        return loads(decoded)
    except:
        return decoded

ix = open_dir(dirname="./model/index")
qp = QueryParser("content", schema=ix.schema)
# we are using b64 encoding for the potential to pass more complex data
q = qp.parse(decodeInput())
with ix.searcher() as searcher:
    results = searcher.search(q, limit=10)
    print(dumps(dict(response)))
