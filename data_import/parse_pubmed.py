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
logger.add("database-import.log", level="DEBUG")
## IMPORTS ABOVE

CHUNK_SIZE = 1000
import pubmed_parser as pp
dbconfig = {
    'user': 'citationdb',
    'password': 'citationdb',
    'database': 'citationdb',
    'host': '/home/nbeals/work/maintenance/Citation-Galaxies/sockets/.s.PGSQL.5432'
}
poolconfig = dbconfig.copy()
poolconfig.update({
    'min_size': 10,
    'max_size': 20,
    'max_inactive_connection_lifetime': 60*10,
    'command_timeout': 60*60*4,
})

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
    if len(fulltext_data) < 1:
        return None
    # general_data = path[0]
    # fulltext_data = path[1]
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
    cite_vector = { 'љљ': [1,rbound]} # i am abusing postgres ts_vector to my own needs, these two numbers are how i represent any given words left and right distance to the closest citation

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
            if len(word) >= (1<<11):
                logger.warning("skipped giant string: '{}'",word)
                continue
            if word.isnumeric() or len(word) < 3:
                continue

            # word = wnl.lemmatize(word)
            if word not in stopwords and word != 'љљ':
                entry = cite_vector.setdefault( sbs.stem(word) , [1E9,-1E9] )
                if sent_num <= cite_sent: #citation happening after sentence AKA postgres tsquery"{search term} <{dist}> ЉЉ"
                    entry[1] = max( entry[1], (rbound-rdistance) )
                
                if sent_num >= last_left_cite: # current sentence is after a citation
                    entry[0] = min( entry[0], ldistance ) + 1


        if sent_num == cite_sent:
            lastpos = spans[cite_sent-1][1]+1 #beggining of sentence after the citation we found already
            # if sent_num > 
            last_left_cite = cite_sent
        # if token not in punctuation and (len(token)>0) and (word_pos<=65535):

        sent_num += 1

    for key,val in cite_vector.items():
        if val[1] == -1E9:
            del val[1]
        if val[0] == 1E9:
            del val[0]


    fulltext = ' '.join( [general_data['full_title'], general_data['abstract'], fulltext] ).replace('ЉЉ','')
    # text_vector = utils.to_tsvector(fulltext)

    if pub_year >= 2003 and pub_year <= 2019:
        return (    int(general_data['pmc'] ),
                    fulltext,
                    cite_vector,
                    pub_year,
                    citation_distribution[0],citation_distribution[1],citation_distribution[2],citation_distribution[3],citation_distribution[4],citation_distribution[5],citation_distribution[6],citation_distribution[7],citation_distribution[8],citation_distribution[9],citation_distribution[10],citation_distribution[11],citation_distribution[12],citation_distribution[13],citation_distribution[14],citation_distribution[15],citation_distribution[16],citation_distribution[17],citation_distribution[18],citation_distribution[19],citation_distribution[20],citation_distribution[21],citation_distribution[22],citation_distribution[23],citation_distribution[24],citation_distribution[25],citation_distribution[26],citation_distribution[27],citation_distribution[28],citation_distribution[29],citation_distribution[30],citation_distribution[31],citation_distribution[32],citation_distribution[33],citation_distribution[34],citation_distribution[35],citation_distribution[36],citation_distribution[37],citation_distribution[38],citation_distribution[39],citation_distribution[40],citation_distribution[41],citation_distribution[42],citation_distribution[43],citation_distribution[44],citation_distribution[45],citation_distribution[46],citation_distribution[47],citation_distribution[48],citation_distribution[49],citation_distribution[50],citation_distribution[51],citation_distribution[52],citation_distribution[53],citation_distribution[54],citation_distribution[55],citation_distribution[56],citation_distribution[57],citation_distribution[58],citation_distribution[59],citation_distribution[60],citation_distribution[61],citation_distribution[62],citation_distribution[63],citation_distribution[64],citation_distribution[65],citation_distribution[66],citation_distribution[67],citation_distribution[68],citation_distribution[69],citation_distribution[70],citation_distribution[71],citation_distribution[72],citation_distribution[73],citation_distribution[74],citation_distribution[75],citation_distribution[76],citation_distribution[77],citation_distribution[78],citation_distribution[79],citation_distribution[80],citation_distribution[81],citation_distribution[82],citation_distribution[83],citation_distribution[84],citation_distribution[85],citation_distribution[86],citation_distribution[87],citation_distribution[88],citation_distribution[89],citation_distribution[90],citation_distribution[91],citation_distribution[92],citation_distribution[93],citation_distribution[94],citation_distribution[95],citation_distribution[96],citation_distribution[97],citation_distribution[98],citation_distribution[99]
                )
    else:
        return None

async def insert_ts( data ):
    all_results = (receive_xml_ts(path) for path in data)
    filt_results = ( doc for doc in all_results if doc is not None )

    con = await asyncpg.connect(**dbconfig)
    # await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector_text, decoder=utils.decode_tsvector_text, format='text')
    await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector2, decoder=utils.decode_tsvector, format='binary')
    # await con.set_type_codec( '_uint1', encoder=lambda x: struct.pack('!B',x), decoder=lambda x: struct.unpack('!B',x), format='binary')
    # await con.set_type_codec( 'uint1',schema='public', encoder=enc_uint1, decoder=lambda x: struct.unpack('!B',x), format='binary')
    # await con.set_builtin_type_codec( 'uint1', schema='public', codec_name='oid', format='binary')
    # await con.set_builtin_type_codec( 'uint1', schema='public', codec_name='uint1', format='binary')
    # result = await con.copy_records_to_table( 'article_search', records=filt_results, columns=['id','pub_year','cite_in_01', 'cite_in_02', 'cite_in_03', 'cite_in_04', 'cite_in_05', 'cite_in_06', 'cite_in_07', 'cite_in_08', 'cite_in_09', 'cite_in_10', 'cite_in_11', 'cite_in_12', 'cite_in_13', 'cite_in_14', 'cite_in_15', 'cite_in_16', 'cite_in_17', 'cite_in_18', 'cite_in_19', 'cite_in_20', 'cite_in_21', 'cite_in_22', 'cite_in_23', 'cite_in_24', 'cite_in_25', 'cite_in_26', 'cite_in_27', 'cite_in_28', 'cite_in_29', 'cite_in_30', 'cite_in_31', 'cite_in_32', 'cite_in_33', 'cite_in_34', 'cite_in_35', 'cite_in_36', 'cite_in_37', 'cite_in_38', 'cite_in_39', 'cite_in_40', 'cite_in_41', 'cite_in_42', 'cite_in_43', 'cite_in_44', 'cite_in_45', 'cite_in_46', 'cite_in_47', 'cite_in_48', 'cite_in_49', 'cite_in_50', 'cite_in_51', 'cite_in_52', 'cite_in_53', 'cite_in_54', 'cite_in_55', 'cite_in_56', 'cite_in_57', 'cite_in_58', 'cite_in_59', 'cite_in_60', 'cite_in_61', 'cite_in_62', 'cite_in_63', 'cite_in_64', 'cite_in_65', 'cite_in_66', 'cite_in_67', 'cite_in_68', 'cite_in_69', 'cite_in_70', 'cite_in_71', 'cite_in_72', 'cite_in_73', 'cite_in_74', 'cite_in_75', 'cite_in_76', 'cite_in_77', 'cite_in_78', 'cite_in_79', 'cite_in_80', 'cite_in_81', 'cite_in_82', 'cite_in_83', 'cite_in_84', 'cite_in_85', 'cite_in_86', 'cite_in_87', 'cite_in_88', 'cite_in_89', 'cite_in_90', 'cite_in_91', 'cite_in_92', 'cite_in_93', 'cite_in_94', 'cite_in_95', 'cite_in_96', 'cite_in_97', 'cite_in_98', 'cite_in_99', 'cite_in_100',
    # ,'cite_search'] )
    result = await con.copy_records_to_table( 'insert_dummy', records=filt_results, columns=['id','text_search','cite_search','pub_year','cite_in_01', 'cite_in_02', 'cite_in_03', 'cite_in_04', 'cite_in_05', 'cite_in_06', 'cite_in_07', 'cite_in_08', 'cite_in_09', 'cite_in_10', 'cite_in_11', 'cite_in_12', 'cite_in_13', 'cite_in_14', 'cite_in_15', 'cite_in_16', 'cite_in_17', 'cite_in_18', 'cite_in_19', 'cite_in_20', 'cite_in_21', 'cite_in_22', 'cite_in_23', 'cite_in_24', 'cite_in_25', 'cite_in_26', 'cite_in_27', 'cite_in_28', 'cite_in_29', 'cite_in_30', 'cite_in_31', 'cite_in_32', 'cite_in_33', 'cite_in_34', 'cite_in_35', 'cite_in_36', 'cite_in_37', 'cite_in_38', 'cite_in_39', 'cite_in_40', 'cite_in_41', 'cite_in_42', 'cite_in_43', 'cite_in_44', 'cite_in_45', 'cite_in_46', 'cite_in_47', 'cite_in_48', 'cite_in_49', 'cite_in_50', 'cite_in_51', 'cite_in_52', 'cite_in_53', 'cite_in_54', 'cite_in_55', 'cite_in_56', 'cite_in_57', 'cite_in_58', 'cite_in_59', 'cite_in_60', 'cite_in_61', 'cite_in_62', 'cite_in_63', 'cite_in_64', 'cite_in_65', 'cite_in_66', 'cite_in_67', 'cite_in_68', 'cite_in_69', 'cite_in_70', 'cite_in_71', 'cite_in_72', 'cite_in_73', 'cite_in_74', 'cite_in_75', 'cite_in_76', 'cite_in_77', 'cite_in_78', 'cite_in_79', 'cite_in_80', 'cite_in_81', 'cite_in_82', 'cite_in_83', 'cite_in_84', 'cite_in_85', 'cite_in_86', 'cite_in_87', 'cite_in_88', 'cite_in_89', 'cite_in_90', 'cite_in_91', 'cite_in_92', 'cite_in_93', 'cite_in_94', 'cite_in_95', 'cite_in_96', 'cite_in_97', 'cite_in_98', 'cite_in_99', 'cite_in_100'] )
    # result = await con.copy_records_to_table( 'article_search', records=filt_results, columns=['id','pub_year','cite_search','cite_in_01', 'cite_in_02', 'cite_in_03', 'cite_in_04', 'cite_in_05', 'cite_in_06', 'cite_in_07', 'cite_in_08', 'cite_in_09', 'cite_in_10', 'cite_in_11', 'cite_in_12', 'cite_in_13', 'cite_in_14', 'cite_in_15', 'cite_in_16', 'cite_in_17', 'cite_in_18', 'cite_in_19', 'cite_in_20', 'cite_in_21', 'cite_in_22', 'cite_in_23', 'cite_in_24', 'cite_in_25', 'cite_in_26', 'cite_in_27', 'cite_in_28', 'cite_in_29', 'cite_in_30', 'cite_in_31', 'cite_in_32', 'cite_in_33', 'cite_in_34', 'cite_in_35', 'cite_in_36', 'cite_in_37', 'cite_in_38', 'cite_in_39', 'cite_in_40', 'cite_in_41', 'cite_in_42', 'cite_in_43', 'cite_in_44', 'cite_in_45', 'cite_in_46', 'cite_in_47', 'cite_in_48', 'cite_in_49', 'cite_in_50', 'cite_in_51', 'cite_in_52', 'cite_in_53', 'cite_in_54', 'cite_in_55', 'cite_in_56', 'cite_in_57', 'cite_in_58', 'cite_in_59', 'cite_in_60', 'cite_in_61', 'cite_in_62', 'cite_in_63', 'cite_in_64', 'cite_in_65', 'cite_in_66', 'cite_in_67', 'cite_in_68', 'cite_in_69', 'cite_in_70', 'cite_in_71', 'cite_in_72', 'cite_in_73', 'cite_in_74', 'cite_in_75', 'cite_in_76', 'cite_in_77', 'cite_in_78', 'cite_in_79', 'cite_in_80', 'cite_in_81', 'cite_in_82', 'cite_in_83', 'cite_in_84', 'cite_in_85', 'cite_in_86', 'cite_in_87', 'cite_in_88', 'cite_in_89', 'cite_in_90', 'cite_in_91', 'cite_in_92', 'cite_in_93', 'cite_in_94', 'cite_in_95', 'cite_in_96', 'cite_in_97', 'cite_in_98', 'cite_in_99', 'cite_in_100'
    # ] )
    
    # logger.success('Inserted search records: {}', len(data))
    return len(data)




def receive_xml_text( path ):
    general_data = pp.parse_pubmed_xml( path )
    fulltext_data = pp.parse_pubmed_paragraph( path, ref_replace=' ЉЉ ' )
    if len(fulltext_data) < 1:
        return None
    ref_data = pp.parse_pubmed_references( path )
    # general_data = path[0]
    # fulltext_data = path[1]
    # ref_data = path[2]

    pub_year = int(general_data['publication_year'])

    gendata = general_data.copy()
    del gendata['full_title']
    del gendata['abstract']

    gendata['references']=ref_data

    if pub_year >= 2003 and pub_year <= 2020:
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
    result = await con.copy_records_to_table( 'article_text', records=filt_results, columns=['id', 'pub_year','title','abstract','general','sections'] )
    
    # logger.success('Inserted data records: {}', len(data))
    return len(data)



def parse_data( data ):
    parsed_data = []
    for path in data:
        general_data = pp.parse_pubmed_xml( path )
        fulltext_data = pp.parse_pubmed_paragraph( path, ref_replace=' ЉЉ ' )
        ref_data = pp.parse_pubmed_references( path )

        pub_year = int(general_data['publication_year'])
        if len(fulltext_data)>0 and pub_year >= generate_ddl.year_range[0] and pub_year <= generate_ddl.year_range[1]:
            parsed_data.append( (general_data, fulltext_data, ref_data) )

    return parsed_data


async def run( data ):
    done = 0
    try:
        # parsed_data = parse_data( data ) 
        # done = await insert_ts( parsed_data )

        # donee = await insert_text( parsed_data )
        await asyncio.gather( insert_ts( data ), insert_text( data ) )

        # logger.success('Inserted records: {}', done)
    except Exception as ex:
        errid = randint(1000,9999)
        logger.error(f'Caught Insert Error.  UID:{errid} EX: {str(ex)}')
        with open(f'errors/ins_ex_${errid}.json','w') as fp:
            json.dump(data,fp)

    return done
    
def process_main( data ):
    return asyncio.run( run( data ) )



async def try_afunc( func, *args, **kwargs):
    try:
        results = await func(*args, **kwargs)
    except Exception as ex:
        logger.error("Creating db exception: {}", str(ex))
    return results

async def db_conn_and_run( sql, *args, **kwargs ):
    async with asyncpg.create_pool(**dbconfig) as pool:
        results = await try_afunc( pool.execute, sql, *args, **kwargs )
    return results

def create_db():
    logger.warning("Initializing database (and dropping any existing tables).")

    pre_ddl = generate_ddl.create_pre_ddl()

    results = asyncio.run( asyncio.wait_for( db_conn_and_run(pre_ddl), timeout=60*60*4) )

    return results


# index_tmpl = """create index article_search_text_{} on article_search_{} using GIN(text_search);"""
index_tmpl = """create index article_search_citations_{} on article_search_{} using GIN(cite_search);"""
index2_tmpl = """CLUSTER article_search_{} using article_search_citations_{} ;"""
async def create_idx( db, i ):
    query = index_tmpl.format(i,i)
    res = await db.execute( query )
    query = index2_tmpl.format(i,i)
    res = await db.execute( query )
    logger.success(f'Finished generating index for article_search_{i}')
    await asyncio.sleep(0.01)


async def finish_db():
    logger.warning("Generating indexes now")
    post_ddl = generate_ddl.create_post_ddl()

    # async with asyncpg.create_pool(**poolconfig) as pool:
    #     # results = await pool.execute( post_ddl )
    #     await asyncio.gather( *( pool.execute(sql) for sql in post_ddl.split('\n') ) ) # 4 hours
    #     # print(type(post_ddl),post_ddl.split('\n'))
    #     # for sql in post_ddl.split('\n'):
    #     #     print("sql: ", sql)
    #     #     await asyncio.wait_for( pool.execute(sql), 60*60*4)
    async with asyncpg.create_pool(**dbconfig) as pool:
        tasks = []
        # for i in range(generate_ddl.year_range[0],generate_ddl.year_range[1]+1):
            # tasks.append( create_idx(pool, i) )
        for sql in post_ddl.split('\n'):
            if len(sql)>0:
                task = pool.execute(sql)
                # print(sql,task)
                tasks.append( task )
        
        final = await asyncio.gather(*tasks)

        await pool.execute('vacuum (full, analyze);')

        logger.success("finished index generation")





def main():

    # create_db()
    
    # # start 4 worker processes
    # with Pool(processes=28,maxtasksperchild=3) as pool:
    #     # print("Building path list")
    #     # path_xml = xml_path_iterator('/archive/datasets/PubMed/Adipocyte')
    #     path_xml = xml_path_iterator('/home/nbeals/pubmed_data/full_corp')
    #     # path_xml=["/home/nbeals/pubmed_data/full_corp/J_Int_AIDS_Soc/PMC4581083.nxml"]

    #     # chunks = utils.divide_chunks( path_xml, 500 )
    #     res = []

    #     logger.warning(f'Chunking path entries to different processes. Size={CHUNK_SIZE}')
    #     chunk = []
    #     for path in path_xml:
    #         chunk.append(path)
            
    #         if len(chunk) == CHUNK_SIZE:
    #             res.append( pool.apply_async( process_main, (chunk,) ) )
    #             chunk = []

    #     if len(chunk)>0:
    #         res.append( pool.apply_async( process_main, (chunk,) ) )
    #         chunk = []


    #     logger.success("Total Records inserted: ",sum( [r.get() for r in res] ) )

    #     # waiting = True
    #     # lastt = time.time()
    #     # while waiting:
            

    #     #     time.sleep(0.1)

    try:
        # asyncio.run( asyncio.wait_for( finish_db(), 60*60*4) )
        asyncio.run( finish_db() )
    except Exception as ex:
        logger.error("Index creation exception: {}",str(ex))

if __name__ == '__main__':
    main()