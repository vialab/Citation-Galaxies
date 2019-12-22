from pprint import pprint

from multiprocessing import Pool, TimeoutError
import time
import os

# import pubmed_parser.utils
# old_read = pubmed_parser.utils.read_xml

# def new_read( path, nxml = False ):
#     print("NEW READ")
#     return False # old_read( path, nxml )


# pubmed_parser.utils.read_xml = new_read
import pubmed_parser as pp

import asyncio
import asyncpg
import uvloop
uvloop.install()

import struct

import io

import numpy as np

from dateutil.relativedelta import relativedelta
import datetime
import utils

import string
import nltk
from nltk.tokenize.treebank import TreebankWordTokenizer, TreebankWordDetokenizer
from nltk.stem import WordNetLemmatizer
wnl = WordNetLemmatizer()
sbs = nltk.stem.snowball.EnglishStemmer()
tbwt = TreebankWordTokenizer()
stopwords = set( nltk.corpus.stopwords.words('english') )
punctuation = string.punctuation + "''``"
translate = str.maketrans('', '', string.punctuation)
# translate.setdefault(58,' ')

path_xml = pp.list_xml_path('/archive/datasets/PubMed/Adipocyte') # list all xml paths under directory
# path_xml = pp.list_xml_path('/archive/datasets/PubMed') # list all xml paths under directory
# path_xml = pp.list_xml_path('/home/nbeals/pubmed_data/full_corp') # list all xml paths under directory
# print(len(path_xml))

pathh = '/archive/datasets/PubMed/Rev_Bras_Ortop/PMC4563043.nxml'
pubmed_dict = pp.parse_pubmed_xml(pathh) # dictionary output
full_dat = pp.parse_pubmed_paragraph(pathh,"||")




dat = [ ('hello',[1,4]), ('world',[2]) ]

def comp_vecs(t1,t2):
    same = True

    for word1, word2 in zip(t1,t2):
        # print(word1,word2)

        if word1[0] != word2[0]:
            same = False
            print("Word text doesn't match, not sorted?")
            break

        for p1,p2 in zip(word1[1],word2[1]):
            if p1 != p2:
                same = False
                print("word positions wrong")
                break

    return same

import parse_pubmed

async def main():
    # recs = ( (dat,) ,)
    # recs = [ (5,to_tsvector("hello world hello again") )]

    con = await asyncpg.connect(user='citationdb',password='citationdb',database='citationdb')
    await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector, decoder=utils.decode_tsvector, format='binary')

    xmls = pp.list_xml_path('/archive/datasets/PubMed/J_Cell_Sci')
    # xmls = pp.list_xml_path('/archive/datasets/PubMed/Mol_Cancer')
    # xmls = pp.list_xml_path('/archive/datasets/PubMed/Brain_Struct_Funct')[1:10]
    # xmls= ['/archive/datasets/PubMed/Mol_Cancer/PMC4676894.nxml']

    recs = [ parse_pubmed.receive_xml_ts(path) for path in xmls ]
    # for path in xmls:
    #     dat = parse_pubmed.receive_xml(path)
    #     print(dat)
    # recs = ( (dat[0],dat[1],dat[2]), )
    # recs = ( dat, )

    # text = dat[3]

    print("wa")
    dat = recs[0]

    # result = await con.execute( "insert into article_search values($1,to_tsvector($2),$3)",dat[0],dat[3],dat[2])
    # result = await con.fetchval( "select to_tsvector($1)",dat[3])
    # print("pg to_ts: ",result)


    # result = await con.copy_records_to_table( 'article_search', records = recs, columns=['id','ts_search','pub_year'] )
    # print("INSERT res: ",result)

    print("catch")

    # result = await con.fetchval(
    #     "SELECT to_tsvector('hello world i be going hello exquisite place of decorum and another hello')")
    # print("SELECT res: ",result)

    # result = await con.fetchval(
    #     "INSERT into test4 (vec) values(to_tsvector('hello world i hello') )")
    # print("INSERT res: ",result)

    # counts = [i for i in range(0,100)]
    # for i in range(0,100000):
    #     result = await con.execute('insert into test5(cite_counts) values($1)',counts)
    # result = (await con.fetchrow('select * from test5'))

    tot = np.zeros(100)
    ret = []
    print("strart")
    async with con.transaction():
        # Postgres requires non-scrollable cursors to be created
        # and used in a transaction.
        # async for record in con.cursor('SELECT cite_counts from test5'):
        async for record in con.cursor('SELECT sections::json from article_text limit 5'):
            print(record)
            # tot += np.array(record.get('cite_counts'),dtype=np.uint8)
            # ret.append( np.array( record.get('cite_counts'), dtype=np.uint32 ) )

    tot = np.sum(ret,axis=0,dtype=np.int32)
    # print("result",tot)
    print("2done",res)


if __name__ == "__main__":
    # asyncio.get_event_loop().run_until_complete( main() )
    asyncio.run( main() )






