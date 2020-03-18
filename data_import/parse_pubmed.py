# -*- coding: utf-8 -*-
# from pprint import pprint
import uvloop
uvloop.install()


import multiprocessing
from multiprocessing import Pool, TimeoutError
import time
import os
import json
import math

from random import randint

import asyncio
import asyncpg

import utils
import generate_ddl

import string
import nltk
from nltk.tokenize import sent_tokenize
from nltk.tokenize.punkt import PunktSentenceTokenizer
from nltk.tokenize.treebank import TreebankWordTokenizer, TreebankWordDetokenizer
from nltk.stem import WordNetLemmatizer
wnl = WordNetLemmatizer()
sbs = nltk.stem.snowball.EnglishStemmer()
tbwt = TreebankWordTokenizer()
punkt = PunktSentenceTokenizer()
stopwords = set( nltk.corpus.stopwords.words('english') )
punctuation = string.punctuation + "''``"
translate = str.maketrans('', '', string.punctuation)
remove_punc = ";:,.!?"


from loguru import logger

## IMPORTS ABOVE

CHUNK_SIZE = 1500
import pubmed_parser as pp
dbconfig = {
    'user': 'citationdb',
    'password': 'citationdb',
    'database': 'citationdb2',
}

# Ref replacement alias: љљ (lower) ЉЉ (upper)



def xml_path_iterator( path_dir ):
    fullpath = ( os.path.join(dp, f) for dp, dn, fn in os.walk(os.path.expanduser(path_dir)) for f in fn if os.path.splitext(f)[-1] in ('.nxml', '.xml') )
    return fullpath

def xml_path_list( path_dir ):
    fullpath = [os.path.join(dp, f) for dp, dn, fn in os.walk(os.path.expanduser(path_dir)) for f in fn if os.path.splitext(f)[-1] in ('.nxml', '.xml') ]
    return fullpath




its = 0

def receive_xml_ts( path ):
    general_data = pp.parse_pubmed_xml( path )
    fulltext_data = pp.parse_pubmed_paragraph( path, ref_replace=' ЉЉ ' )
    # pprint(fulltext_data)
    pub_year = int(general_data['publication_year'])

    fulltext = ' '.join( (section['text'] for section in fulltext_data ) )

    # Count citations made
    citation_distribution = [ 0 for i in range(100) ]
    find = True
    lastpos = 0
    while find:
        pos = fulltext.find( 'ЉЉ', lastpos )

        if pos >= 0:
            percent = ((pos+2) / len(fulltext)) * 100
            citation_distribution[ math.floor(percent) ] += 1
            lastpos = pos + 2
        else:
            find = False
    citation_distribution = [ c if c > 0 else None for c in citation_distribution ]

    
    sent_tokens = punkt.tokenize( fulltext )
    spans = list(punkt.span_tokenize( fulltext ))
    rbound = len(sent_tokens)*3 # just to be extra safe the left searches and right searches dont overlap.
    ts_vector = { 'љљ': [1,rbound]} # i am abusing postgres ts_vector to my own needs, these two numbers are how i represent any given words left and right distance to the closest citation

    find = True
    lastpos = 0
    sent_num = 1
    last_left_cite = 1E9 # sentence number of the closest citation made that is to the left of the current search sentence
    for sent in sent_tokens:
        # sent = sent.translate(translate)
        pos = fulltext.find( 'ЉЉ', lastpos )
        if pos > 0:
            cite_sent = [ num+1 for (num,span) in enumerate(spans) if pos >= span[0] and pos <= span[1] ][0]
        else:
            cite_sent = -1000000
        
        rdistance = cite_sent - sent_num
        ldistance = sent_num - last_left_cite
        words = tbwt.tokenize(sent.translate(translate).lower())
        for word in words:
            if word not in stopwords and word != 'љљ':
                entry = ts_vector.setdefault( word , [1E9,-1E9] )
                if sent_num <= cite_sent: #citation happening after sentence AKA postgres tsquery"{search term} <{dist}> ЉЉ"
                    entry[1] = max( entry[1], (rbound-rdistance) )
                
                if sent_num >= last_left_cite: # current sentence is after a citation
                    entry[0] = min( entry[0], ldistance ) + 1
                # else: # end
                    # pass

        if sent_num == cite_sent:
            lastpos = spans[cite_sent-1][1]+1 #beggining of sentence after the citation we found already
            # if sent_num > 
            last_left_cite = cite_sent
        # if token not in punctuation and (len(token)>0) and (word_pos<=65535):

        sent_num += 1

    for key,val in ts_vector.items():
        if val[1] == -1E9:
            del val[1]
        if val[0] == 1E9:
            del val[0]


    # fulltext = (' '.join( [general_data['full_title'], general_data['abstract'], fulltext] ))

    if pub_year >= 2003 and pub_year <= 2019:
        return (    int(general_data['pmc'] ),
                    # utils.encode_tsvector_text(ts_vector),
                    ts_vector,
                    # utils.to_tsvector( ' '.join([general_data['full_title'], general_data['abstract'], fulltext]) ),
                    # fulltext,
                    pub_year,
                    *citation_distribution
                )
    else:
        return None
        # print("dropping rec")

async def insert_ts( data ):
    all_results = (receive_xml_ts(path) for path in data)
    # filt_results = ( doc for doc in all_results if doc[2]>=2003 and doc[2]<=2019 )
    filt_results = ( doc for doc in all_results if doc is not None )

    con = await asyncpg.connect(**dbconfig)
    # await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=lambda x: x, decoder=lambda x: x, format='binary')
    # await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector_text, decoder=utils.decode_tsvector_text, format='text')
    # await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector_text, decoder=utils.decode_tsvector_text, format='binary')
    await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector2, decoder=utils.decode_tsvector, format='binary')
    # result = await con.copy_records_to_table( 'article_search', records=filt_results, columns=['id','ts_search','pub_year','cite_in_01', 'cite_in_02', 'cite_in_03', 'cite_in_04', 'cite_in_05', 'cite_in_06', 'cite_in_07', 'cite_in_08', 'cite_in_09', 'cite_in_10', 'cite_in_11', 'cite_in_12', 'cite_in_13', 'cite_in_14', 'cite_in_15', 'cite_in_16', 'cite_in_17', 'cite_in_18', 'cite_in_19', 'cite_in_20', 'cite_in_21', 'cite_in_22', 'cite_in_23', 'cite_in_24', 'cite_in_25', 'cite_in_26', 'cite_in_27', 'cite_in_28', 'cite_in_29', 'cite_in_30', 'cite_in_31', 'cite_in_32', 'cite_in_33', 'cite_in_34', 'cite_in_35', 'cite_in_36', 'cite_in_37', 'cite_in_38', 'cite_in_39', 'cite_in_40', 'cite_in_41', 'cite_in_42', 'cite_in_43', 'cite_in_44', 'cite_in_45', 'cite_in_46', 'cite_in_47', 'cite_in_48', 'cite_in_49', 'cite_in_50', 'cite_in_51', 'cite_in_52', 'cite_in_53', 'cite_in_54', 'cite_in_55', 'cite_in_56', 'cite_in_57', 'cite_in_58', 'cite_in_59', 'cite_in_60', 'cite_in_61', 'cite_in_62', 'cite_in_63', 'cite_in_64', 'cite_in_65', 'cite_in_66', 'cite_in_67', 'cite_in_68', 'cite_in_69', 'cite_in_70', 'cite_in_71', 'cite_in_72', 'cite_in_73', 'cite_in_74', 'cite_in_75', 'cite_in_76', 'cite_in_77', 'cite_in_78', 'cite_in_79', 'cite_in_80', 'cite_in_81', 'cite_in_82', 'cite_in_83', 'cite_in_84', 'cite_in_85', 'cite_in_86', 'cite_in_87', 'cite_in_88', 'cite_in_89', 'cite_in_90', 'cite_in_91', 'cite_in_92', 'cite_in_93', 'cite_in_94', 'cite_in_95', 'cite_in_96', 'cite_in_97', 'cite_in_98', 'cite_in_99', 'cite_in_100'] )
    # result = await con.copy_records_to_table( 'article_search', records=filt_results, columns=['id','pub_year','cite_in_01', 'cite_in_02', 'cite_in_03', 'cite_in_04', 'cite_in_05', 'cite_in_06', 'cite_in_07', 'cite_in_08', 'cite_in_09', 'cite_in_10', 'cite_in_11', 'cite_in_12', 'cite_in_13', 'cite_in_14', 'cite_in_15', 'cite_in_16', 'cite_in_17', 'cite_in_18', 'cite_in_19', 'cite_in_20', 'cite_in_21', 'cite_in_22', 'cite_in_23', 'cite_in_24', 'cite_in_25', 'cite_in_26', 'cite_in_27', 'cite_in_28', 'cite_in_29', 'cite_in_30', 'cite_in_31', 'cite_in_32', 'cite_in_33', 'cite_in_34', 'cite_in_35', 'cite_in_36', 'cite_in_37', 'cite_in_38', 'cite_in_39', 'cite_in_40', 'cite_in_41', 'cite_in_42', 'cite_in_43', 'cite_in_44', 'cite_in_45', 'cite_in_46', 'cite_in_47', 'cite_in_48', 'cite_in_49', 'cite_in_50', 'cite_in_51', 'cite_in_52', 'cite_in_53', 'cite_in_54', 'cite_in_55', 'cite_in_56', 'cite_in_57', 'cite_in_58', 'cite_in_59', 'cite_in_60', 'cite_in_61', 'cite_in_62', 'cite_in_63', 'cite_in_64', 'cite_in_65', 'cite_in_66', 'cite_in_67', 'cite_in_68', 'cite_in_69', 'cite_in_70', 'cite_in_71', 'cite_in_72', 'cite_in_73', 'cite_in_74', 'cite_in_75', 'cite_in_76', 'cite_in_77', 'cite_in_78', 'cite_in_79', 'cite_in_80', 'cite_in_81', 'cite_in_82', 'cite_in_83', 'cite_in_84', 'cite_in_85', 'cite_in_86', 'cite_in_87', 'cite_in_88', 'cite_in_89', 'cite_in_90', 'cite_in_91', 'cite_in_92', 'cite_in_93', 'cite_in_94', 'cite_in_95', 'cite_in_96', 'cite_in_97', 'cite_in_98', 'cite_in_99', 'cite_in_100', 'body'] )
    result = await con.copy_records_to_table( 'article_search', records=filt_results, columns=['id','ts_search','pub_year','cite_in_01', 'cite_in_02', 'cite_in_03', 'cite_in_04', 'cite_in_05', 'cite_in_06', 'cite_in_07', 'cite_in_08', 'cite_in_09', 'cite_in_10', 'cite_in_11', 'cite_in_12', 'cite_in_13', 'cite_in_14', 'cite_in_15', 'cite_in_16', 'cite_in_17', 'cite_in_18', 'cite_in_19', 'cite_in_20', 'cite_in_21', 'cite_in_22', 'cite_in_23', 'cite_in_24', 'cite_in_25', 'cite_in_26', 'cite_in_27', 'cite_in_28', 'cite_in_29', 'cite_in_30', 'cite_in_31', 'cite_in_32', 'cite_in_33', 'cite_in_34', 'cite_in_35', 'cite_in_36', 'cite_in_37', 'cite_in_38', 'cite_in_39', 'cite_in_40', 'cite_in_41', 'cite_in_42', 'cite_in_43', 'cite_in_44', 'cite_in_45', 'cite_in_46', 'cite_in_47', 'cite_in_48', 'cite_in_49', 'cite_in_50', 'cite_in_51', 'cite_in_52', 'cite_in_53', 'cite_in_54', 'cite_in_55', 'cite_in_56', 'cite_in_57', 'cite_in_58', 'cite_in_59', 'cite_in_60', 'cite_in_61', 'cite_in_62', 'cite_in_63', 'cite_in_64', 'cite_in_65', 'cite_in_66', 'cite_in_67', 'cite_in_68', 'cite_in_69', 'cite_in_70', 'cite_in_71', 'cite_in_72', 'cite_in_73', 'cite_in_74', 'cite_in_75', 'cite_in_76', 'cite_in_77', 'cite_in_78', 'cite_in_79', 'cite_in_80', 'cite_in_81', 'cite_in_82', 'cite_in_83', 'cite_in_84', 'cite_in_85', 'cite_in_86', 'cite_in_87', 'cite_in_88', 'cite_in_89', 'cite_in_90', 'cite_in_91', 'cite_in_92', 'cite_in_93', 'cite_in_94', 'cite_in_95', 'cite_in_96', 'cite_in_97', 'cite_in_98', 'cite_in_99', 'cite_in_100'] )
    
    # logger.success('Inserted search records: {}', len(data))
    return len(data)




def receive_xml_text( path ):
    general_data = pp.parse_pubmed_xml( path )
    fulltext_data = pp.parse_pubmed_paragraph( path, ref_replace=' ЉЉ ' )
    ref_data = pp.parse_pubmed_references( path )
    # pprint(fulltext_data)
    # fulltext = "".join( (section['text'] for section in fulltext_data ) )

    pub_year = int(general_data['publication_year'])

    gendata = general_data.copy()
    del gendata['full_title']
    del gendata['abstract']

    gendata['references']=ref_data

    if pub_year >= 2003 and pub_year <= 2019:
        return (    int(general_data['pmc'] ),
                    int(pub_year),
                    general_data['full_title'],
                    general_data['abstract'],
                    json.dumps(gendata),
                    json.dumps(fulltext_data)
                )
    else:
        return None

async def insert_text( data ):
    all_results = (receive_xml_text(path) for path in data)
    filt_results = ( doc for doc in all_results if doc is not None )

    con = await asyncpg.connect(**dbconfig)

    result = await con.copy_records_to_table( 'article_text', records=filt_results, columns=['id', 'pub_year','title','abstract','article_data','sections'] )
    
    # logger.success('Inserted data records: {}', len(data))
    return len(data)






async def run( data ):
    done = 0
    try:
        done = await insert_ts( data )

        donee = await insert_text( data )

        # logger.success('Inserted records: {}', done)
    except Exception as ex:
        logger.error("Caught Insert EX: ",ex,'\n',str(ex))
    return done
    
def process_main( data ):
    return asyncio.run( run( data ) )




async def create_db():
    logger.warning("Initializing database (and dropping any existing tables")
    pre_ddl = generate_ddl.create_pre_ddl()

    async with asyncpg.create_pool(**dbconfig) as pool:
        results = await pool.execute(pre_ddl)

    return results

index_tmpl = """create index article_search_ts_{} on article_search_{} using GIN(ts_search);"""
async def create_idx( db, i ):
    query = index_tmpl.format(i,i)
    res = await db.execute( query )
    logger.success(f'Finished generating index for article_search_{i}')
    await asyncio.sleep(0.01)


async def finish_db():
    logger.warning("Generating indexes now")
    post_ddl = generate_ddl.create_post_ddl()
    # con = await asyncpg.connect(**dbconfig)
    # cluster_tmpl = """cluster article_search_{} using article_search_ts_{};"""

    # for i in range(2003,2020):
    #     print(index_tmpl.format(i,i))
    async with asyncpg.create_pool(**dbconfig) as pool:
        results = await pool.execute( post_ddl )
    #     tasks = []
    #     for i in range(2003,2020):
    #         tasks.append( create_idx(pool, i) )
        
    #     final = await asyncio.gather(*tasks)

    logger.success("finished index generation")

def main():

    try:
        asyncio.run(create_db())
    except Exception as ex:
        print("Creating db exception: ", ex)
    
    # start 4 worker processes
    with Pool(processes=24) as pool:
        # print("Building path list")
        # path_xml = xml_path_iterator('/archive/datasets/PubMed/Adipocyte')
        path_xml = xml_path_iterator('/home/nbeals/pubmed_data/full_corp')

        # chunks = utils.divide_chunks( path_xml, 500 )
        res = []

        logger.warning("chunking")
        chunk = []
        for path in path_xml:
            chunk.append(path)
            
            if len(chunk) == CHUNK_SIZE:
                res.append( pool.apply_async( process_main, (chunk,) ) )
                chunk = []

        if len(chunk)>0:
            res.append( pool.apply_async( process_main, (chunk,) ) )

        logger.success("Total Records inserted: ",sum( [r.get() for r in res] ) )


    asyncio.run(finish_db())

if __name__ == '__main__':
    main()