#!/usr/bin/env python3
"""
    Processes the stored signal searches and populates temporary tables with the ids of the matching articles using the cookie id to name them
"""

import asyncio
import re
import time
from json import dumps, loads


import string
punctuation = string.punctuation + "''``\""
removePunc = str.maketrans('', '', string.punctuation)

from aiohttp import web
from aiohttp_session import get_session, setup
from cryptography import fernet

import citation_galaxy.database as dblib
from citation_galaxy.database import NUMBER_COLS, QueryManager, api, schema
from citation_galaxy.settings import config as conf
from citation_galaxy.utils import list_in_string

routes = web.RouteTableDef()


def parseRangeString(str):
    return tuple(map(int, re.findall(r"\d+", str)))


def get_db(request):
    return request.app['db']

async def get_db_sess(request):
    return request.app['db'], await get_session(request)


english_to_modifier = {
    'AND':      ' && ',
    'OR':       ' || ',
    'AND NOT':  ' && !! ',
    'OR NOT':   ' || !! '
}

# TODO use this code in views.py -> query and papers func to generate their searches
def build_signal_search( signals ):

    search_text_tmpl = "(setweight(websearch_to_tsquery('english',${}),'BD') && "
    search_cite_tmpl = "setweight(to_tsquery('english',${}),'BC'))"
    
    search_body = "article_search where text_search @@ ("
    search_params = []
    arg_num = 1 #postgres argnum counter

    for signal in loads(signals['signal']):
        search_input = signal['query']

        signal_search = search_text_tmpl.format(arg_num)
        search_params.append(search_input)
        arg_num+=1
        
        if signal.get('modifier',False):
            signal_search = english_to_modifier[signal['modifier']] + signal_search
            if signal.get('modifier','') == 'OR NOT' or signal.get('modifier','') == 'AND NOT':
                search_body += signal_search[:-4] + ')'
                continue # no range checks on NOT modifiers

        words_left=signal['range'][0]
        words_right=signal['range'][1]
        signal_search += search_cite_tmpl.format(arg_num)
        arg_num+=1
        if words_left >= 0 or words_right >= 0:
            # subsearch_text = "where text_search @@ to_tsquery('english', $2) "
            subsearch_params = []
            stripped_input = search_input.translate(removePunc)
            stripped_input = stripped_input.replace(" or ", " ")
            stripped_input = stripped_input.replace(" and ", " ")
            for word in stripped_input.split(" "):
                for dist in range(0, words_left + 1):

                    subsearch_params.append(f"{word} <{dist}> ЉЉ")

                for dist in range(0, words_right + 1):
                    subsearch_params.append(f"ЉЉ <{dist}> {word}")

            search_params.append(" | ".join(subsearch_params))
            # search_values = ' & '.join( ( word for word in search_input.split(' ') ) )

        # else:
        #     search_text = "article_search"

        # subsearch_text += "group by pub_year order by pub_year"

        search_body += signal_search

    search_body += ')'
    return  (search_body, search_params)


temp_tbl_create = """drop table if exists citationdb_temp.user_{0};
create table citationdb_temp.user_{0} (
	cat_id int4 references public.signalcategory not null,
	sig_id int4 references public.signal not null,
	art_id int4 null
);
"""
temp_tbl_tmpl = """insert into citationdb_temp.user_{0} (cat_id,sig_id,art_id)
select {1} as cat_id, {2} as sig_id, id as art_id from {3};
"""
@routes.get('/signals/process/{cookie_id}')
async def process_signals(request):
    db, sess = await get_db_sess(request)

    cookie_id = request.match_info['cookie_id']

    categories = await db.fetch( 'select id, catname from signalcategory where cookieid=$1', cookie_id)

    await db.execute(temp_tbl_create.format(cookie_id))
    created = False
    jobs = []
    for category in categories:
        signals = await db.fetch( 'select id, signal from signal where signalcategoryid=$1 and cookieid=$2', int(category['id']), cookie_id)

        for signal in signals:
            subquery, args = build_signal_search( signal )

            # if not created:
                # query = f'create table citationdb_temp.user_{cookie_id} as select {category["id"]} as cat_id, {signal["id"]} as sig_id, id as art_id from {subquery};'
                # await db.execute(temp_tbl_create,cookie_id)
                # created=True
            # else:
            # query = f'insert into citationdb_temp.user_{cookie_id} select {category["id"]} as cat_id, {signal["id"]} as sig_id, id as art_id from {subquery};'
            query = temp_tbl_tmpl.format(cookie_id, category['id'], signal['id'], subquery)
            # print("about to run: ", query)
            # print("args: ",args)
            jobs.append( db.execute( query, *args) )
    results = await asyncio.gather(*jobs)
    return web.json_response(results)