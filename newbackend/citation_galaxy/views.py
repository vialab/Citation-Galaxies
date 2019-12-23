# views.py
import asyncio
import aiohttp_jinja2
from aiohttp import web

from . import db
import time

from citation_galaxy.settings import config as conf
from citation_galaxy.db import NUMBER_COLS


count_columns = [ (i+1) for i in range(NUMBER_COLS) ]

def reshape_count_columns( percent_range = 10 ):
    if (NUMBER_COLS % percent_range) != 0:
        raise ValueError(f'percent_range={percent_range} must evenly divide NUMBER_COLS={NUMBER_COLS}, division remainder: {NUMBER_COLS%percent_range}')

    # for (i,count) in zip(range(0,NUMBER_COLS,percent_range), range(0,int(NUMBER_COLS/percent_range))):
        # yield count_columns[i:i+percent_range], count+1
    return [ (count_columns[i:i+percent_range], count+1) for (i,count) in zip(range(0,NUMBER_COLS,percent_range), range(0,int(NUMBER_COLS/percent_range))) ]

def build_summing_query( percent_range = 10 ):
    columns_in_bins = reshape_count_columns( percent_range )
    body = ' from (select * from {0}) as d {1}'
    return 'select ' + ', '.join( ( '+'.join( ( f'sum(cite_in_{el:02d})' for el in chunk ) ) + f' as c{count}' for (chunk,count) in columns_in_bins ) ) + body

def build_counting_query( percent_range = 10 ):
    columns_in_bins = reshape_count_columns( percent_range )
    body = ' from (select ts_search, pub_year,' + ', '.join( ( f'case when (' + '+'.join( ( f'coalesce(cite_in_{el:02d},0)' for el in chunk ) ) + f')>1 then 1 else 0 end as c{count}' for (chunk,count) in columns_in_bins ) ) 
    body += ' from {0}) as d {1}'  
    
    return 'select ' + ', '.join( ( f'sum(c{count}) as c{count}' for (chunk,count) in columns_in_bins ) ) + body

def fill_in_query_conditions( query , search, values ):
    pass

print("hi")
async def query_row_sums():
    pass

async def query(request):
    # print("query:",request,db.question.select())
    query_params = await request.json()
    num_bins = query_params.get('increment', 10)
    search_text = query_params.get('query', '')
    words_left = query_params.get('rangeLeft',0)
    words_right = query_params.get('rangeRight',0)

    query_text = build_summing_query( num_bins )
    query_search = ''
    query_values = 

    if len(search_text) > 0:
        # do something about range left & rangeright
        
        query_search = 'where ts_search @@ to_tsquery($1)'
        query_values = ' & '.join( ( word for word in search_text.split(' ') ) )

        query_text

    
    tasks = []
    for year in range(conf['year_range']['min'],conf['year_range']['max']):
        print('year:',year)
        # tasks.append( asyncio.create_task( request.app['db'].fetchrow( 'select count(id) as count, ' + quer + f' from article_search_{year}' ) ) )
        tasks.append( asyncio.create_task( request.app['db'].fetchrow( querytext + f' from article_search_{year}' ) ) )
        await asyncio.sleep(0.05)

    print("tasks: ",tasks)
    # print("wait: ",await tasks[15])
    print("done")

    sums = [ [val for val in (await task).values()] for task in tasks ]
    agg = {}
    for year in range(2003,2019):
        agg.setdefault(str(year), {'content': sums[year-2003],'max': max(sums[year-2003])} )


    return web.json_response( {'agg':agg} )


    # async with con.transaction():
    #     # Postgres requires non-scrollable cursors to be created
    #     # and used in a transaction.
    #     # async for record in con.cursor('SELECT cite_counts from test5'):
    #     async for record in con.cursor('''select pub_year, sum( cite_in_01) as "1", sum( cite_in_02), sum( cite_in_03), sum( cite_in_04), sum( cite_in_05), sum( cite_in_06), sum( cite_in_07), sum( cite_in_08), sum( cite_in_09), sum( cite_in_10), sum( cite_in_11), sum( cite_in_12), sum( cite_in_13), sum( cite_in_14), sum( cite_in_15), sum( cite_in_16), sum( cite_in_17), sum( cite_in_18), sum( cite_in_19), sum( cite_in_20), sum( cite_in_21), sum( cite_in_22), sum( cite_in_23), sum( cite_in_24), sum( cite_in_25), sum( cite_in_26), sum( cite_in_27), sum( cite_in_28), sum( cite_in_29), sum( cite_in_30), sum( cite_in_31), sum( cite_in_32), sum( cite_in_33), sum( cite_in_34), sum( cite_in_35), sum( cite_in_36), sum( cite_in_37), sum( cite_in_38), sum( cite_in_39), sum( cite_in_40), sum( cite_in_41), sum( cite_in_42), sum( cite_in_43), sum( cite_in_44), sum( cite_in_45), sum( cite_in_46), sum( cite_in_47), sum( cite_in_48), sum( cite_in_49), sum( cite_in_50), sum( cite_in_51), sum( cite_in_52), sum( cite_in_53), sum( cite_in_54), sum( cite_in_55), sum( cite_in_56), sum( cite_in_57), sum( cite_in_58), sum( cite_in_59), sum( cite_in_60), sum( cite_in_61), sum( cite_in_62), sum( cite_in_63), sum( cite_in_64), sum( cite_in_65), sum( cite_in_66), sum( cite_in_67), sum( cite_in_68), sum( cite_in_69), sum( cite_in_70), sum( cite_in_71), sum( cite_in_72), sum( cite_in_73), sum( cite_in_74), sum( cite_in_75), sum( cite_in_76), sum( cite_in_77), sum( cite_in_78), sum( cite_in_79), sum( cite_in_80), sum( cite_in_81), sum( cite_in_82), sum( cite_in_83), sum( cite_in_84), sum( cite_in_85), sum( cite_in_86), sum( cite_in_87), sum( cite_in_88), sum( cite_in_89), sum( cite_in_90), sum( cite_in_91), sum( cite_in_92), sum( cite_in_93), sum( cite_in_94), sum( cite_in_95), sum( cite_in_96), sum( cite_in_97), sum( cite_in_98), sum( cite_in_99), sum( cite_in_100)
    #                                         from article_search group by pub_year
    #                                     ''',prefetch=1):
    #         print(time.time(),record)

async def years(request):
    returnvalue = []

    for year in range(2003,2019):
        returnvalue.append( {'articleyear': year} )

    return web.json_response( returnvalue )

# @aiohttp_jinja2.template('index.html')
async def index(request):
    # async with request.app['db'].acquire() as conn:
    #     cursor = await conn.execute(db.question.select())
    #     records = await cursor.fetchall()
    #     questions = [dict(q) for q in records]
    #     return {'questions': questions}
    return web.FileResponse('./citation_galaxy/public/index.html')


@aiohttp_jinja2.template('detail.html')
async def poll(request):
    async with request.app['db'].acquire() as conn:
        question_id = request.match_info['question_id']
        try:
            question, choices = await db.get_question(conn,
                                                      question_id)
        except db.RecordNotFound as e:
            raise web.HTTPNotFound(text=str(e))
        return {
            'question': question,
            'choices': choices
        }


@aiohttp_jinja2.template('results.html')
async def results(request):
    async with request.app['db'].acquire() as conn:
        question_id = request.match_info['question_id']

        try:
            question, choices = await db.get_question(conn,
                                                      question_id)
        except db.RecordNotFound as e:
            raise web.HTTPNotFound(text=str(e))

        return {
            'question': question,
            'choices': choices
        }


async def vote(request):
    async with request.app['db'].acquire() as conn:
        question_id = int(request.match_info['question_id'])
        data = await request.post()
        try:
            choice_id = int(data['choice'])
        except (KeyError, TypeError, ValueError) as e:
            raise web.HTTPBadRequest(
                text='You have not specified choice value') from e
        try:
            await db.vote(conn, question_id, choice_id)
        except db.RecordNotFound as e:
            raise web.HTTPNotFound(text=str(e))
        router = request.app.router
        url = router['results'].url_for(question_id=str(question_id))
        return web.HTTPFound(location=url)
