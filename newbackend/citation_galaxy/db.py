import hashlib
import copyreg
import pickle

import math as m

import asyncpg


class asyncpgRecordProxy(object):
    def __init__(self, data):
        self._data = data
        self._keymap = {}

        for (key,value) in self._data:
            self._keymap[key]=value

    def items(self):
        return self._data

    def values(self):
        for (key,value) in self._data:
            yield value

    def keys(self):
        for (key,value) in self._data:
            yield key
    
    def get(self, key, default=None):
        return self._keymap.get(key,default)

    def __getitem__(self, key):
        if isinstance(key, str):
            return self.__getattribute__(key)
        else:
            return self._data[key][1]

    def __getattribute__(self, key):
        if object.__getattribute__(self, '_keymap').get(key,None) is not None:
            return object.__getattribute__(self, '_keymap')[key]
        else:
            return object.__getattribute__(self, key)
            # if key[0] == '_':
            # return getattr(self, key)

    def __repr__(self):
        return '<Record ' + ' '.join( (f'{key}={value}' for (key,value) in self._data) ) + '>'


def pickle_asyncpgRecord( rec ):
    return ( asyncpgRecordProxy, (list(rec.items()),) )
copyreg.pickle(asyncpg.Record,pickle_asyncpgRecord)




NUMBER_COLS = 100

count_columns = [ (i+1) for i in range(NUMBER_COLS) ]

def reshape_count_columns( percent_range = 10 ):
    if (NUMBER_COLS % percent_range) != 0:
        raise ValueError(f'percent_range={percent_range} must evenly divide NUMBER_COLS={NUMBER_COLS}, division remainder: {NUMBER_COLS%percent_range}')

    return [ (count_columns[i:i+percent_range], count+1) for (i,count) in zip(range(0,NUMBER_COLS,percent_range), range(0,int(NUMBER_COLS/percent_range))) ]


def fill_in_query_conditions( query , search, values ):
    pass

class QueryManager():

    def __init__(self, db, percent_range = 10, search_text = '', subsearch_text = '', search_params = []):
        # super().__init__()
        self.db = db
        self.percent_range = percent_range
        self.search_text = search_text
        self.subsearch_text = subsearch_text
        self.search_params = search_params

    def build_summing_query(self):
        columns_in_bins = reshape_count_columns( self.percent_range )
        body = ' from (select * from {0}) as d {1}'
        return 'select pub_year, ' + ', '.join( ( '+'.join( ( f'sum(cite_in_{el:02d})' for el in chunk ) ) + f' as c{count}' for (chunk,count) in columns_in_bins ) ) + body

    async def do_summing_query(self):
        query_text = self.build_summing_query().format( self.search_text, self.subsearch_text )

        return await self.do_query( query_text )
        

    def build_counting_query(self):
        columns_in_bins = reshape_count_columns( self.percent_range )
        body = ' from (select ts_search, pub_year,' + ', '.join( ( f'case when (' + '+'.join( ( f'coalesce(cite_in_{el:02d},0)' for el in chunk ) ) + f')>1 then 1 else 0 end as c{count}' for (chunk,count) in columns_in_bins ) ) 
        body += ' from {0}) as d {1}'  
        
        return 'select pub_year, ' + ', '.join( ( f'sum(c{count}) as c{count}' for (chunk,count) in columns_in_bins ) ) + body

    async def do_counting_query(self):
        query_text = self.build_counting_query().format( self.search_text, self.subsearch_text )

        return await self.do_query( query_text )


    def build_paper_query(self, year_range_tup, rowLimit = 10, rowOffset = 0):
        columns_in_bins = reshape_count_columns( self.percent_range )
        year = year_range_tup[0]
        left_col = year_range_tup[1]
        right_col = year_range_tup[2]


        body = f' from (select * from article_search_{year}'+' {0}) as t1 ' + f'inner join article_text_{year} as t2 on t1.id = t2.id ' + '{1}'
        body += f' order by ref_count_{ int(right_col/self.percent_range ) } desc limit {rowLimit} offset {rowOffset}'

        return 'select t2.id, t2.pub_year, t2.title, t2.abstract, t2.article_data, t2.sections, ' + ', '.join( ( '('+'+'.join( ( f'coalesce(cite_in_{col:02d},0)' for col in chunk ) ) + f') as ref_count_{count}' for (chunk,count) in columns_in_bins ) ) + body
        # return 'select title, abstract, article_data, sections, ' +  ', '.join( ( '+'.join( f'coalesce(cite_in_{col:02d},0)' for col in range(sel[1]+1,sel[2]+1) ) + f' as ref_count' for sel in range_list ) )
        # return 'select title, abstract, article_data, section_data, ' +  ', '.join( ( '+'.join( ( f'coalesce(cite_in_{el:02d},0)' for el in chunk ) ) + f' as c{count}' for (chunk,count) in columns_in_bins ) ) + body

    async def do_paper_query(self, *args, **kwargs):
        query_text = self.build_paper_query( *args, **kwargs ).format( self.search_text, self.subsearch_text )

        return await self.do_query( query_text )


    async def do_query(self, query_text, use_cache = True):
        sha = hashlib.shake_256( query_text.lower().encode('utf-8') )
        if len(self.search_params) > 0:
            sha.update( ' , '.join(sorted(self.search_params)).lower().encode('utf-8') )
        hashid = int.from_bytes( sha.digest(7), 'big' )

        results = None
        if use_cache:
            results = await self.db.fetchval( 'select data from query_cache where id = $1', hashid )

        if results is None:
            if len(self.search_params) > 0:
                results = await self.db.fetch(query_text, *self.search_params)
            else:
                results = await self.db.fetch(query_text)

            insert = await self.db.execute( 'insert into query_cache(id, data) values ($1, $2)', hashid, pickle.dumps(results) )
        else:
            results = pickle.loads( results )

        return results







import aiopg.sa
from sqlalchemy import (
    MetaData, Table, Column, ForeignKey,
    Integer, String, Date
)

__all__ = ['question', 'choice']

meta = MetaData()

question = Table(
    'question', meta,

    Column('id', Integer, primary_key=True),
    Column('question_text', String(200), nullable=False),
    Column('pub_date', Date, nullable=False)
)

choice = Table(
    'choice', meta,

    Column('id', Integer, primary_key=True),
    Column('choice_text', String(200), nullable=False),
    Column('votes', Integer, server_default="0", nullable=False),

    Column('question_id',
           Integer,
           ForeignKey('question.id', ondelete='CASCADE'))
)


class RecordNotFound(Exception):
    """Requested record in database was not found"""


async def init_pg(app):
    conf = app['config']['postgres']
    engine = await aiopg.sa.create_engine(
        database=conf['database'],
        user=conf['user'],
        password=conf['password'],
        host=conf['host'],
        port=conf['port'],
        minsize=conf['minsize'],
        maxsize=conf['maxsize'],
    )
    app['db'] = engine


async def close_pg(app):
    app['db'].close()
    await app['db'].wait_closed()






async def get_question(conn, question_id):
    result = await conn.execute(
        question.select()
        .where(question.c.id == question_id))
    question_record = await result.first()
    if not question_record:
        msg = "Question with id: {} does not exists"
        raise RecordNotFound(msg.format(question_id))
    result = await conn.execute(
        choice.select()
        .where(choice.c.question_id == question_id)
        .order_by(choice.c.id))
    choice_records = await result.fetchall()
    return question_record, choice_records


async def vote(conn, question_id, choice_id):
    result = await conn.execute(
        choice.update()
        .returning(*choice.c)
        .where(choice.c.question_id == question_id)
        .where(choice.c.id == choice_id)
        .values(votes=choice.c.votes+1))
    record = await result.fetchone()
    if not record:
        msg = "Question with id: {} or choice id: {} does not exists"
        raise RecordNotFound(msg.format(question_id, choice_id))
