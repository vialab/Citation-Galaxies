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

import utils


def xml_path_iterator( path_dir ):
    fullpath = [os.path.join(dp, f) for dp, dn, fn in os.walk(os.path.expanduser(path_dir)) for f in fn]
    path_list = (folder for folder in fullpath if os.path.splitext(folder)[-1] in ('.nxml', '.xml'))
    return path_list

def xml_path_list( path_dir ):
    fullpath = [os.path.join(dp, f) for dp, dn, fn in os.walk(os.path.expanduser(path_dir)) for f in fn if os.path.splitext(f)[-1] in ('.nxml', '.xml') ]
    return fullpath


its = 0

def receive_xml( path ):
    general_data = pp.parse_pubmed_xml( path )
    fulltext_data = pp.parse_pubmed_paragraph( path, ref_replace=' †‡ ' )
    # pprint(fulltext_data)
    fulltext = "".join( (section['text'] for section in fulltext_data ) )

    pub_year = int(general_data['publication_year'])
    
    # return (general_data['full_title'],general_data['abstract'],general_data['full_title'] + ' ' + general_data['abstract'] + ' ' + fulltext,fulltext.replace("ZQZ",""),int(general_data['publication_year']))
    # return (general_data['full_title'],general_data['abstract'],fulltext.replace("ЉЉ",""),int(general_data['publication_year']))
    # return (general_data['full_title'],general_data['abstract'],fulltext,int(general_data['publication_year']))
    # if pub_year > 2003:
    # global its
    # its += 1

    # if ( its%1000 == 0 ):
    #     print("progress: ",its, "  ",path)

    return (    int(general_data['pmc'] ),
                # utils.to_tsvector( ' '.join([general_data['full_title'], general_data['abstract'], fulltext]) ),
                ' '.join([general_data['full_title'], general_data['abstract'], fulltext]),
                pub_year
            )
    # else:
        # print("dropping rec")


async def insert( iter ):
    # print("inserting",list(iter))
    # print("inserting")
    con = await asyncpg.connect(user='citationdb',password='citationdb',database='citationdb')

    await con.set_type_codec( 'tsvector', schema='pg_catalog', encoder=utils.encode_tsvector, decoder=utils.decode_tsvector, format='binary')

    # result = await con.copy_records_to_table(
        # 'text_search', records=iter, columns=['title','abstract',"body",'pub_year']  )

    # print("just before",iter)
    # result = await con.copy_records_to_table( 'article_search', records=iter, columns=['id','ts_search','pub_year'] )
    result = await con.copy_records_to_table( 'article_search', records=iter, columns=['id','body','pub_year'] )
    
    print("Insert res: ",result)
    return True


async def run( data ):
    all_results = (receive_xml(path) for path in data)
    filt_results = ( doc for doc in all_results if doc[2]>=2003 and doc[2]<=2019 )

    try:
        done = await insert( filt_results )
    except Exception as ex:
        print("Caught Insert EX: ",ex,'\n')
        # print("data: ",data)
        # print("data: ",data[1],data[-1])


def process_main( data ):
    return asyncio.run( run( data ) )


if __name__ == '__main__':
    # res = asyncio.run( run() )
    # print("RES: ",res)
    # start 4 worker processes
    with Pool(processes=24) as pool:
    # with Pool(processes=1) as pool:
        print("Building path list")
        # pubmed_dict = pp.parse_pubmed_xml(path_xml[0]) # dictionary output
        # path_xml = xml_path_iterator('/archive/datasets/PubMed/Adipocyte')
        # path_xml = xml_path_list('/archive/datasets/PubMed/Adipocyte')
        # path_xml = xml_path_list('/archive/datasets/PubMed')[4000:]
        # path_xml =  ['/archive/datasets/PubMed/Neurochem_Res/PMC3778764.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC5357490.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC4493940.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC5524878.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC5357501.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC3183265.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC3264868.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC3111726.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC5842265.nxml', '/archive/datasets/PubMed/Neurochem_Res/PMC3183298.nxml']
        # path_xml =  [ '/archive/datasets/PubMed/Neurochem_Res/PMC5357490.nxml']
        # path_xml = xml_path_list('/archive/datasets/PubMed/J_Cell_Sci')
        # path_xml = xml_path_iterator('/home/nbeals/pubmed_data/full_corp')
        path_xml = xml_path_list('/home/nbeals/pubmed_data/full_corp')
        chunks = utils.divide_chunks( path_xml, 1000 )

        print("chunked")

        res = pool.map_async( process_main, chunks )
        print("pool res: ",res.get())