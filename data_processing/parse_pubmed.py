# -*- coding: utf-8 -*-
from pprint import pprint

import multiprocessing
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

import utils
import json
import math

def xml_path_iterator( path_dir ):
    fullpath = ( os.path.join(dp, f) for dp, dn, fn in os.walk(os.path.expanduser(path_dir)) for f in fn if os.path.splitext(f)[-1] in ('.nxml', '.xml') )
    return fullpath

def xml_path_list( path_dir ):
    fullpath = [os.path.join(dp, f) for dp, dn, fn in os.walk(os.path.expanduser(path_dir)) for f in fn if os.path.splitext(f)[-1] in ('.nxml', '.xml') ]
    return fullpath


its = 0

def receive_xml_ts( path ):
    general_data = pp.parse_pubmed_xml( path )
    fulltext_data = pp.parse_pubmed_paragraph( path, ref_replace=' †‡ ' )
    # pprint(fulltext_data)
    pub_year = int(general_data['publication_year'])

    fulltext = ' '.join( (section['text'] for section in fulltext_data ) )

    citation_distribution = [ 0 for i in range(100) ]
    find = True
    lastpos = 0
    while find:
        pos = fulltext.find( '†‡', lastpos )

        if pos >= 0:
            percent = ((pos+2) / len(fulltext)) * 100
            citation_distribution[ math.floor(percent) ] += 1
            lastpos = pos + 2
        else:
            find = False
    citation_distribution = [ c if c > 0 else None for c in citation_distribution ]

    fulltext = ' '.join( [general_data['full_title'], general_data['abstract'], fulltext] )

    if pub_year >= 2003 and pub_year <= 2019:
        return (    int(general_data['pmc'] ),
                    # utils.to_tsvector( ' '.join([general_data['full_title'], general_data['abstract'], fulltext]) ),
                    fulltext,
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

    con = await asyncpg.connect(user='citationdb',password='citationdb',database='citationdb')
    await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector, decoder=utils.decode_tsvector, format='binary')
    result = await con.copy_records_to_table( 'article_search', records=filt_results, columns=['id','body','pub_year','cite_in_01', 'cite_in_02', 'cite_in_03', 'cite_in_04', 'cite_in_05', 'cite_in_06', 'cite_in_07', 'cite_in_08', 'cite_in_09', 'cite_in_10', 'cite_in_11', 'cite_in_12', 'cite_in_13', 'cite_in_14', 'cite_in_15', 'cite_in_16', 'cite_in_17', 'cite_in_18', 'cite_in_19', 'cite_in_20', 'cite_in_21', 'cite_in_22', 'cite_in_23', 'cite_in_24', 'cite_in_25', 'cite_in_26', 'cite_in_27', 'cite_in_28', 'cite_in_29', 'cite_in_30', 'cite_in_31', 'cite_in_32', 'cite_in_33', 'cite_in_34', 'cite_in_35', 'cite_in_36', 'cite_in_37', 'cite_in_38', 'cite_in_39', 'cite_in_40', 'cite_in_41', 'cite_in_42', 'cite_in_43', 'cite_in_44', 'cite_in_45', 'cite_in_46', 'cite_in_47', 'cite_in_48', 'cite_in_49', 'cite_in_50', 'cite_in_51', 'cite_in_52', 'cite_in_53', 'cite_in_54', 'cite_in_55', 'cite_in_56', 'cite_in_57', 'cite_in_58', 'cite_in_59', 'cite_in_60', 'cite_in_61', 'cite_in_62', 'cite_in_63', 'cite_in_64', 'cite_in_65', 'cite_in_66', 'cite_in_67', 'cite_in_68', 'cite_in_69', 'cite_in_70', 'cite_in_71', 'cite_in_72', 'cite_in_73', 'cite_in_74', 'cite_in_75', 'cite_in_76', 'cite_in_77', 'cite_in_78', 'cite_in_79', 'cite_in_80', 'cite_in_81', 'cite_in_82', 'cite_in_83', 'cite_in_84', 'cite_in_85', 'cite_in_86', 'cite_in_87', 'cite_in_88', 'cite_in_89', 'cite_in_90', 'cite_in_91', 'cite_in_92', 'cite_in_93', 'cite_in_94', 'cite_in_95', 'cite_in_96', 'cite_in_97', 'cite_in_98', 'cite_in_99', 'cite_in_100'] )
    
    print("Insert res: ",result)
    return True


def receive_xml_text( path ):
    general_data = pp.parse_pubmed_xml( path )
    fulltext_data = pp.parse_pubmed_paragraph( path, ref_replace=' †‡ ' )
    # pprint(fulltext_data)
    # fulltext = "".join( (section['text'] for section in fulltext_data ) )

    pub_year = int(general_data['publication_year'])


    if pub_year >= 2003 and pub_year <= 2019:
        return (    int(general_data['pmc'] ),
                    general_data['full_title'],
                    general_data['abstract'],
                    json.dumps(fulltext_data),
                    pub_year
                )
    else:
        return None
        # print("dropping rec")

async def insert_text( data ):
    all_results = (receive_xml_text(path) for path in data)
    filt_results = ( doc for doc in all_results if doc is not None )

    con = await asyncpg.connect(user='citationdb',password='citationdb',database='citationdb')

    def _encoder(value):
        return json.dumps(value).encode('utf-8')
    def _decoder(value):
        return json.loads(value.decode('utf-8'))
    await conn.set_type_codec(
        'json', encoder=_encoder, decoder=_decoder,
        schema='pg_catalog', format='binary'
    )
    # def _encoder(value):
    #     return json.dumps(value)
    # def _decoder(value):
    #     return json.loads(value)
    # await conn.set_type_codec(
    #     'json', encoder=_encoder, decoder=_decoder,
    #     schema='pg_catalog', format='text'
    # )
    # await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector, decoder=utils.decode_tsvector, format='binary')
    result = await con.copy_records_to_table( 'article_text', records=filt_results, columns=['id','title','abstract','sections','pub_year'] )
    
    print("Insert res: ",result)
    return True


async def run( data ):
    try:
        done = await insert_ts( data )
        # done = await insert_text( data )
    except Exception as ex:
        print("Caught Insert EX: ",ex,'\n')
        # print("data: ",data)
        # print("data: ",data[1],data[-1])


count = 0
def process_main( data ):
    # global count
    # count += 1
    # print( multiprocessing.current_process(), count, data)
    # print(len(data))
    asyncio.run( run( data ) )
    return len(data)


# print("any process",__name__,multiprocessing.current_process())
if __name__ == '__main__':
    # print("in __main__")
    # res = asyncio.run( run() )
    # print("RES: ",res)
    # start 4 worker processes
    with Pool(processes=20) as pool:
    # with Pool(processes=1) as pool:
        print("Building path list")
        # pubmed_dict = pp.parse_pubmed_xml(path_xml[0]) # dictionary output
        # path_xml = xml_path_iterator('/archive/datasets/PubMed/Adipocyte')
        # path_xml = xml_path_list('/archive/datasets/PubMed/Adipocyte')
        # path_xml = xml_path_list('/archive/datasets/PubMed')[4000:]
        # path_xml =  ['/archive/datasets/PubMed/Neurochem_Res/PMC3778764.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC5357490.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC4493940.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC5524878.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC5357501.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC3183265.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC3264868.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC3111726.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC5842265.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC3183298.nxml']
        # path_xml =  [ '/archive/datasets/PubMed/Neurochem_Res/PMC5357490.nxml']
        # path_xml = xml_path_list('/archive/datasets/PubMed/J_Cell_Sci')
        # path_xml = xml_path_list('/home/nbeals/pubmed_data/full_corp')
        path_xml = xml_path_iterator('/home/nbeals/pubmed_data/full_corp')
        # chunks = utils.divide_chunks( path_xml, 500 )

        res = []
        chunksize = 5000

        print("chunking")
        chunk = []
        c = 0
        for path in path_xml:
            chunk.append(path)
            
            if len(chunk) == chunksize:
                # print("batch release")
                res.append( pool.apply_async( process_main, (chunk,) ) )
                chunk = []


        print("waiting")
        # res = pool.map_async( process_main, chunks )
        # res = pool.imap_unordered( process_main, chunks, chunksize=10 )
        # res = pool.imap_unordered( process_main, path_xml )
        # res = pool.imap_unordered( process_main, chunks )
        # print("res: ",res)
        print("Total Records inserted: ",sum( [r.get() for r in res] ) )