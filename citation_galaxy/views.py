# views.py
import asyncio
import re
import time
from json import dumps, loads


import string
punctuation = string.punctuation + "''``\""
removePunc = str.maketrans('', '', string.punctuation)

import aiohttp_jinja2
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

# select id, name, type from signaltype

# @routes.post("/api/signalcategory")
# async def signalCategory(request):
#     db, sess = await get_db_sess(request)

#     # signcalcategoryid = 


#     cookieid = "196d2081988549fb86f38cf1944e79a9"
#     # # TODO Generate cookie ID
#     #   if (cookie === undefined) {
#     # // no: set a new cookie
#     # let nonce = Math.random().toString(),
#     #   cookie_id =
#     #     nonce.substring(2, nonce.length) + "_" + req.connection.remoteAddress;
#     # cookie_id = crypto
#     #   .createHash("md5")
#     #   .update(cookie_id)
#     #   .digest("hex");
#     # res.cookie("cookieName", cookie_id, {expires: new Date(253402300000000)});

#     results = await db.fetch("select id, catname, score, color from signalcategory where enabled and cookieid=$1", sess['id'])

#     data = []
#     if len(results) > 0:
#         for result in results:
#             data.append({
#                 'id':       result['id'],
#                 'catname':  result['catname'],
#                 # 'score':    result['score'],
#                 'color':    result['color']
#             })
#     else:
#         data = [{
#             'id':           -1,
#             'catname':      'example category (deleted when others added)',
#             'color':        '#ffffff'
#         }]

#     return web.json_response( {
#         'data': data,
#         'aliases': {},
#         'links': {
#             'signals': {
#                 'params': {'id': "signalcategoryid"},
#                 'query': "signalbycategory"
#             }},
#         'name': 'signalcategory',
#         'schema': {},
#         'parent': {}
#     })


# @routes.post("/api/signalbytype")
# async def signalByType(request):
#     db = get_db(request)

#     post_data = await request.json()
#     query_params = post_data.get('values')
#     signaltypeid = int(query_params.get("signaltypeid", 10))

#     cookieid = "196d2081988549fb86f38cf1944e79a9"

#     results = await db.fetch("select id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal where enabled and signaltypeid=$1 and cookieid=$2;", signaltypeid, cookieid)

#     data = [{
#             'catname': result['catname'],
#             'score': result['score'],
#             'color': result['color']
#         } for result in results ]

#     return web.json_response( {
#         'data': data,
#         'aliases': {},
#         'links': {},
#         'name': 'signalcategory',
#         'schema': {},
#         'parent': {}
#     })


async def insert_signal(db, sess, post_data, qp ):
    signal_category = qp.get('signalcategoryid', None)
    signal_text = qp.get('signal', None)
    signal_base = qp.get('query',[])

    if signal_text and signal_category:
        if len(signal_base)>0:
            
            pass

        else:
            pass # TODO What to do here?

async def insert_signal_category(db, sess, post_data, qp ): #qp is query_params
    category_name = qp.get('catname',None)
    category_color= qp.get('color',None)

    if category_name and category_color:
        await db.execute( "INSERT INTO signalcategory(catname, cookieid, color) VALUES($1, $2, $3)", category_name, sess['id'], category_color)

async def insert_signal_type(db, sess, post_data, qp):
    pass

@routes.post("/api/insert")
async def insert_handler(request):
    db, sess = await get_db_sess(request)

    post_data = await request.json()
    # query_params = session.get('query_params',{}).copy()
    # query_params.update( post_data.get('values') )
    # query_params = post_data.get('values')

    table_name = post_data.get('table_name','')
    if table_name == 'signalbycategory':
        table_name = 'signal'
    # get api schema
    api_schema = api.get('insert_' + table_name, None)

    if api_schema:
        # await request.read()
        # post_data = {}
        # if request.has_body:
        # post_data = await request.json()
        # query_params = sess.get('query_params',{}).copy()
        # query_params.update( post_data.get('values') )
        query_params = post_data.get('values',{}).copy()
        if api_schema.get('require_cookie', False):
            query_params['cookieid'] = sess['id']

        queries = aiosql.from_str( api_schema['query'], 'asyncpg' )
        query = getattr( queries, queries.available_queries[0] ) # Gets the first created query from the list of queries. This is because i feed individual queries in on it's own and generate them that way

        await query(db, **query_params )

    return web.json_response( {} )
    # return web.json_response( {
    #     'data': data,
    #     'aliases': {},
    #     'links': {},
    #     'name': 'signalcategory',
    #     'schema': {},
    #     'parent': {}
    # })


async def update_signal(db, sess, post_data, qp ):
    signal_category = qp.get('signalcategoryid', None)
    signal_text = qp.get('signal', None)
    signal_base = qp.get('query',[])

    if signal_text and signal_category:
        if len(signal_base)>0:
            
            pass

        else:
            pass # TODO What to do here?

async def update_signal_category(db, sess, post_data, qp ): #qp is query_params
    category_id = int(qp.get('id',None))
    category_name = qp.get('catname',None)
    category_color= qp.get('color',None)

    if category_name and category_color:
        await db.execute( "update signalcategory SET catname=$2, color=$3 where id=$1", category_id, category_name, category_color)

async def update_signal_type(db, sess, post_data, qp):
    pass

@routes.post("/api/update")
async def update_handler(request):
    db, session = await get_db_sess(request)

    post_data = await request.json()
    query_params = session.get('query_params',{}).copy()
    query_params.update( post_data.get('values') )
    # query_params = post_data.get('values')

    name = post_data.get('table_name','')
    
    if name == 'signalcategory':
        results = await update_signal_category(db, session, post_data, query_params)
    elif name == 'signal':
        results = await update_signal(db, session, post_data, query_params)
    elif name =='signaltype':
        results = await update_signal_type(db, session, post_data, query_params)
 
    data = []

    return web.json_response( {} )


import aiosql
@routes.post('/api/{table_name}')
async def api_handler(request):
    db, sess = await get_db_sess(request)

    table_name = request.match_info['table_name']
    # get api schema
    api_schema = api.get(table_name, None)

    if api_schema:
        # await request.read()
        post_data = {}
        # if request.has_body:
        post_data = await request.json()
        # query_params = sess.get('query_params',{}).copy()
        # query_params.update( post_data.get('values') )
        query_params = post_data.get('values',{}).copy()
        if api_schema.get('require_cookie', False):
            query_params['cookieid'] = sess['id']

        queries = aiosql.from_str( api_schema['query'], 'asyncpg' )
        query = getattr( queries, queries.available_queries[0] ) # Gets the first created query from the list of queries. This is because i feed individual queries in on it's own and generate them that way

        results = await query(db, **query_params )
        rows = [ dict(record) for record in results ]

        parent_col = api_schema.get('parent',None)
        parent_id = query_params.get(parent_col,None)
        parent = {}
        if parent_col and parent_id:
            parent = {'id': parent_id, 'col': parent_col}

        return web.json_response({
            'data':     rows,
            'aliases':  api_schema.get('aliases', {}),
            'links':    api_schema.get('links', {}),
            'actions':  api_schema.get('actions', {}),
            'name':     table_name,
            'schema':   schema[api[table_name]['origin']],
            'parent':   parent
        })
    else:
        return web.json_response( {} )


@routes.post('/gateway/process/signals')
async def process_signal(request):
    db, session = await get_db_sess(request)

    query_params = await request.json()

    data = {
        'front_data': {},
        'signal_scores': {}
    }

    return web.json_response(data)



@routes.post("/gateway/papers")
async def papers(request):
    db = get_db(request)

    # print("query:",request,db.question.select())
    query_params = await request.json()
    increment = int(query_params.get("increment", 10))
    # range_list = query_params.get('selections', None)
    range_list = list(map(parseRangeString, query_params.get("selections", None)))

    search_input = query_params.get("query", "")
    words_left = query_params.get("rangeLeft", 0)
    words_right = query_params.get("rangeRight", 0)

    last_rank = int(query_params.get("lastRank", 0))
    n_rank = query_params.get("nrank", 0)
    signals = query_params.get("signals", {})
    journal_id = query_params.get("journalid", "")

    search_text = ""
    subsearch_text = ""
    search_params = []
    if len(search_input) > 0:
        # search_text = 'article_search where ts_search @@ to_tsquery(\'{0}\')'.format( ' & '.join( ( word for word in search_input ) ) )
        search_text += (
            " where text_search @@ to_tsquery('english', $1)"  # .format( ' & '.join( ( word for word in search_input ) ) )
        )
        search_params.append(" & ".join((word for word in search_input)))

        if words_left > 0 or words_right > 0:
            subsearch_text = "where cite_search @@ to_tsquery('english', $2) "

            subsearch_params = []
            for word in search_input:
                for dist in range(1, words_left + 1):

                    subsearch_params.append(f"{word} <{dist}> љљ")

                for dist in range(1, words_right + 1):
                    subsearch_params.append(f"љљ <{dist}> {word}")

            search_params.append(" | ".join(subsearch_params))

        # search_values = ' & '.join( ( word for word in search_input.split(' ') ) )

    # else:
    # search_text = 'article_search'

    # subsearch_text += 'group by pub_year order by pub_year'

    querymanager = QueryManager(db, increment, search_text, subsearch_text, search_params)

    tasks = [querymanager.do_papers_query(year_range_tup, n_rank, last_rank) for year_range_tup in range_list]
    results = await asyncio.gather(*tasks)

    sorted_articles = {}
    years = set()
    journals = {}

    for yearResults in results:
        for (count, row) in enumerate(yearResults):
            rec = {
                "content": {},
                "max": 0,
                "year": row["pub_year"],
                "rank": (count + 1) + last_rank,
                "total": 0,
            }

            for (chunk, count) in dblib.reshape_count_columns(increment):
                rec["content"][count] = row[f"ref_count_{count}"]

            journal_id = int(row.get("journalid", 0))
            # journals.setdefault(journal_id, {"title": row["journaltitle"], "years": set()})
            # journals[journal_id]['years'].add(row['pub_year'])
            years.add(row["pub_year"])

            rec["max"] = max(rec["content"].values())

            sorted_articles[row["id"]] = rec

    maxCount = max(d["max"] for d in sorted_articles.values())

    return web.json_response({"max": maxCount, "papers": sorted_articles, "years": list(years), "journals": journals,})


@routes.get("/gateway/paper")
async def paper(request):
    # db = request.app["db"]
    db, session = await get_db_sess(request)
    paper_id = int(request.rel_url.query["id"])

    # session = await get_session(request)
    query_params = session.get('query_params',{})
    query_list = query_params.get('query',[])

    querymanager = QueryManager(db)
    results = (await querymanager.do_paper_query(paper_id))[0]
    sections = loads(results["sections"])

    data = {
        "id": results["id"],
        "papertext": "",
        "charcount": 0,
        "articletitle": results.get("title", ""),
        "articleyear": results["pub_year"],
        "journaltitle": "",
        # 'paragraphs': results['sections'],
    }

    keep_sections = []
    for section in sections:
        if len(query_list)==0 or list_in_string(query_list, section['text'].lower()) or list_in_string(query_list, section['section'].lower()):
            for ref in section["reference_ids"]:
                section["text"] = section["text"].replace("ЉЉ", ref, 1)

                section.setdefault("citations", []).append(
                    {"citationtext": ref,}
                )

            keep_sections.append( section )

    data["paragraphs"] = keep_sections

    return web.json_response(data)


# Query route
async def query(request):
    # db = request.app["db"]
    db, session = await get_db_sess(request)

    # print("query:",request,db.question.select())
    query_params = await request.json()
    num_bins = query_params.get("increment", 10)
    search_input = query_params.get("query", "").lower()
    words_left = query_params.get("rangeLeft", -1)
    words_right = query_params.get("rangeRight", -1)

    # Session
    # session = await get_session(request)
    session['query_params'] = query_params
    session['query_params']['query'] = search_input
    # last_visit = session['last_visit'] if 'last_visit' in session else None
    # session['last_visit'] = time.time()
    # text = 'Last visited: {}'.format(last_visit)

    # query_text = build_summing_query( num_bins )
    query_text = ""

    query_search = ""

    search_text = ""
    subsearch_text = ""
    search_params = []

    if len(search_input) > 0:
        # search_text = 'article_search where ts_search @@ to_tsquery(\'{0}\')'.format( ' & '.join( ( word for word in search_input ) ) )
        search_text = "article_search where text_search @@ websearch_to_tsquery('english', $1)"  # .format( ' & '.join( ( word for word in search_input ) ) )
        # search_params.append(" & ".join((word for word in search_input)))
        search_params.append(search_input)

        if words_left >= 0 or words_right >= 0:
            subsearch_text = "where cite_search @@ to_tsquery('english', $2) "

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

    else:
        search_text = "article_search"

    subsearch_text += "group by pub_year order by pub_year"

    # tasks = []
    # for year in range(conf['year_range']['min'],conf['year_range']['max']+1):
    #     print('year:',year)
    #     # tasks.append( asyncio.create_task( request.app['db'].fetchrow( 'select count(id) as count, ' + quer + f' from article_search_{year}' ) ) )
    #     tasks.append( asyncio.create_task( request.app['db'].fetchrow( query_text + f' from article_search_{year}' ) ) )
    #     await asyncio.sleep(0.05)

    # print("tasks: ",tasks)
    # print("wait: ",await tasks[15])

    # task = asyncio.create_task( req)
    # tasks = await db.fetch( query_text )

    # sums = [ [val for val in task.values()] for task in tasks ]
    # agg = {}
    # for year in range(2003,2019):
    #     agg.setdefault(str(year), {'content': sums[year-2003],'max': max(sums[year-2003])} )

    querymanager = QueryManager(db, num_bins, search_text, subsearch_text, search_params)

    results = await asyncio.gather(
        querymanager.do_summing_query(),
        querymanager.do_counting_query()
        # do_summing_query( db, num_bins, search_text, subsearch_text, search_params),
        # do_counting_query( db, num_bins, search_text, subsearch_text, search_params)
    )

    # results = await do_summing_query(db, num_bins, '' )
    agg = {}
    for row in results[0]:
        year = row.get("pub_year")
        counts = list(row.values())[1:]
        counts = [0 if v is None else v for v in counts]

        agg.setdefault(str(year), {"content": counts, "max": max(counts)})

    for row in results[1]:
        year = row.get("pub_year")
        counts = list(row.values())[1:]
        counts = [0 if v is None else v for v in counts]

        data = agg.get(str(year), {})
        data.setdefault("papers", {"content": counts, "max": max(counts)})

    return web.json_response({"agg": agg})

    # async with con.transaction():
    #     # Postgres requires non-scrollable cursors to be created
    #     # and used in a transaction.
    #     # async for record in con.cursor('SELECT cite_counts from test5'):
    #     async for record in con.cursor('''select pub_year, sum( cite_in_01) as "1", sum( cite_in_02), sum( cite_in_03), sum( cite_in_04), sum( cite_in_05), sum( cite_in_06), sum( cite_in_07), sum( cite_in_08), sum( cite_in_09), sum( cite_in_10), sum( cite_in_11), sum( cite_in_12), sum( cite_in_13), sum( cite_in_14), sum( cite_in_15), sum( cite_in_16), sum( cite_in_17), sum( cite_in_18), sum( cite_in_19), sum( cite_in_20), sum( cite_in_21), sum( cite_in_22), sum( cite_in_23), sum( cite_in_24), sum( cite_in_25), sum( cite_in_26), sum( cite_in_27), sum( cite_in_28), sum( cite_in_29), sum( cite_in_30), sum( cite_in_31), sum( cite_in_32), sum( cite_in_33), sum( cite_in_34), sum( cite_in_35), sum( cite_in_36), sum( cite_in_37), sum( cite_in_38), sum( cite_in_39), sum( cite_in_40), sum( cite_in_41), sum( cite_in_42), sum( cite_in_43), sum( cite_in_44), sum( cite_in_45), sum( cite_in_46), sum( cite_in_47), sum( cite_in_48), sum( cite_in_49), sum( cite_in_50), sum( cite_in_51), sum( cite_in_52), sum( cite_in_53), sum( cite_in_54), sum( cite_in_55), sum( cite_in_56), sum( cite_in_57), sum( cite_in_58), sum( cite_in_59), sum( cite_in_60), sum( cite_in_61), sum( cite_in_62), sum( cite_in_63), sum( cite_in_64), sum( cite_in_65), sum( cite_in_66), sum( cite_in_67), sum( cite_in_68), sum( cite_in_69), sum( cite_in_70), sum( cite_in_71), sum( cite_in_72), sum( cite_in_73), sum( cite_in_74), sum( cite_in_75), sum( cite_in_76), sum( cite_in_77), sum( cite_in_78), sum( cite_in_79), sum( cite_in_80), sum( cite_in_81), sum( cite_in_82), sum( cite_in_83), sum( cite_in_84), sum( cite_in_85), sum( cite_in_86), sum( cite_in_87), sum( cite_in_88), sum( cite_in_89), sum( cite_in_90), sum( cite_in_91), sum( cite_in_92), sum( cite_in_93), sum( cite_in_94), sum( cite_in_95), sum( cite_in_96), sum( cite_in_97), sum( cite_in_98), sum( cite_in_99), sum( cite_in_100)
    #                                         from article_search group by pub_year
    #                                     ''',prefetch=1):
    #         print(time.time(),record)


async def years(request):
    """ Returns a list of dictionaries where the dicts have an entry named "articleyear" and an integer associated with it
    """
    sess = await get_session(request)
    if not sess.get('id',False):
        key = fernet.Fernet.generate_key()
        sess.setdefault('id',key.decode('utf-8'))

    return web.json_response(
        [{"articleyear": year} for year in range(conf["year_range"]["min"], conf["year_range"]["max"] + 1)]
    )


# @aiohttp_jinja2.template('index.html')
@routes.get('/')
async def index(request):
    return web.FileResponse("./citation_galaxy/public/index.html")


# @aiohttp_jinja2.template('detail.html')
# async def poll(request):
#     async with request.app['db'].acquire() as conn:
#         question_id = request.match_info['question_id']
#         try:
#             question, choices = await db.get_question(conn,
#                                                       question_id)
#         except db.RecordNotFound as e:
#             raise web.HTTPNotFound(text=str(e))
#         return {
#             'question': question,
#             'choices': choices
#         }


# @aiohttp_jinja2.template('results.html')
# async def results(request):
#     async with request.app['db'].acquire() as conn:
#         question_id = request.match_info['question_id']

#         try:
#             question, choices = await db.get_question(conn,
#                                                       question_id)
#         except db.RecordNotFound as e:
#             raise web.HTTPNotFound(text=str(e))

#         return {
#             'question': question,
#             'choices': choices
#         }


# async def vote(request):
#     async with request.app['db'].acquire() as conn:
#         question_id = int(request.match_info['question_id'])
#         data = await request.post()
#         try:
#             choice_id = int(data['choice'])
#         except (KeyError, TypeError, ValueError) as e:
#             raise web.HTTPBadRequest(
#                 text='You have not specified choice value') from e
#         try:
#             await db.vote(conn, question_id, choice_id)
#         except db.RecordNotFound as e:
#             raise web.HTTPNotFound(text=str(e))
#         router = request.app.router
#         url = router['results'].url_for(question_id=str(question_id))
#         return web.HTTPFound(location=url)
