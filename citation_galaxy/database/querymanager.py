import hashlib
import pickle

from uuid import UUID

import asyncpg

NUMBER_COLS = 100

count_columns = [(i + 1) for i in range(NUMBER_COLS)]


def reshape_count_columns(percent_range=10):
    if (NUMBER_COLS % percent_range) != 0:
        raise ValueError(
            f"percent_range={percent_range} must evenly divide NUMBER_COLS={NUMBER_COLS}, division remainder: {NUMBER_COLS%percent_range}"
        )

    return [
        (count_columns[i : i + percent_range], count + 1)
        for (i, count) in zip(range(0, NUMBER_COLS, percent_range), range(0, int(NUMBER_COLS / percent_range)))
    ]


def fill_in_query_conditions(query, search, values):
    pass


class QueryManager:
    def __init__(self, db, percent_range=10, search_text="", subsearch_text="", search_params=[]):
        # super().__init__()
        self.db = db
        self.percent_range = percent_range
        self.search_text = search_text
        self.subsearch_text = subsearch_text
        self.search_params = search_params

    def build_summing_query(self):
        columns_in_bins = reshape_count_columns(self.percent_range)
        body = " from (select * from {0}) as d {1}"
        return (
            "select pub_year, "
            + ", ".join(
                (
                    "+".join((f"sum(cite_in_{el:02d})" for el in chunk)) + f" as c{count}"
                    for (chunk, count) in columns_in_bins
                )
            )
            + body
        )

    async def do_summing_query(self):
        query_text = self.build_summing_query().format(self.search_text, self.subsearch_text)

        return await self.do_query(query_text)

    def build_counting_query(self):
        columns_in_bins = reshape_count_columns(self.percent_range)
        body = " from (select ts_search, pub_year," + ", ".join(
            (
                f"case when ("
                + "+".join((f"coalesce(cite_in_{el:02d},0)" for el in chunk))
                + f")>1 then 1 else 0 end as c{count}"
                for (chunk, count) in columns_in_bins
            )
        )
        body += " from {0}) as d {1}"

        return (
            "select pub_year, " + ", ".join((f"sum(c{count}) as c{count}" for (chunk, count) in columns_in_bins)) + body
        )

    async def do_counting_query(self):
        query_text = self.build_counting_query().format(self.search_text, self.subsearch_text)

        return await self.do_query(query_text)

    def build_papers_query(self, year_range_tup, rowLimit=25, rowOffset=0):
        columns_in_bins = reshape_count_columns(self.percent_range)
        year = year_range_tup[0]
        _left_col = year_range_tup[1]  # left ignored because these overlap, I.E 2010:0-10, 2010:10-20, 2010:20-30, etc.
        right_col = year_range_tup[2]

        body = (
            f" from (select * from article_search_{year}"
            + " {0}) as t1 "
            + f"inner join article_text_{year} as t2 on t1.id = t2.id "
            + "{1}"
        )
        body += f" order by ref_count_{ int(right_col/self.percent_range ) } desc limit {rowLimit} offset {rowOffset}"

        return (
            "select t2.id, t2.pub_year, "
            + ", ".join(
                (
                    "(" + "+".join((f"coalesce(cite_in_{col:02d},0)" for col in chunk)) + f") as ref_count_{count}"
                    for (chunk, count) in columns_in_bins
                )
            )
            + body
        )
        # return 'select t2.id, t2.pub_year, t2.title, t2.abstract, t2.article_data, t2.sections, ' + ', '.join( ( '('+'+'.join( ( f'coalesce(cite_in_{col:02d},0)' for col in chunk ) ) + f') as ref_count_{count}' for (chunk,count) in columns_in_bins ) ) + body

    async def do_papers_query(self, *args, **kwargs):
        query_text = self.build_papers_query(*args, **kwargs).format(self.search_text, self.subsearch_text)

        return await self.do_query(query_text)

    def build_paper_query(self, id):
        return f"select * from article_text where id = {id}"

    async def do_paper_query(self, *args, **kwargs):
        query_text = self.build_paper_query(*args, **kwargs)

        return await self.do_query(query_text, False)  # always a fast query, dont cache it

    async def do_query(self, query_text, use_cache=True):
        # sha = hashlib.shake_256(query_text.lower().encode("utf-8"))
        sha = hashlib.md5(query_text.lower().encode("utf-8"))
        if len(self.search_params) > 0:
            sha.update(" , ".join(self.search_params).lower().encode("utf-8"))
        # hashid = int.from_bytes(sha.digest(7), "big")
        # hashid = int.from_bytes(sha.digest(), "big")
        hashid = UUID( bytes=sha.digest() )

        results = None
        if use_cache:
            results = await self.db.fetchval("select data from query_cache where id = $1", hashid)

        if results is None:
            if len(self.search_params) > 0:
                results = await self.db.fetch(query_text, *self.search_params)
            else:
                results = await self.db.fetch(query_text)

            if use_cache:
                _insert = await self.db.execute(
                    "insert into query_cache(id, data) values ($1, $2)", hashid, pickle.dumps(results)
                )
        else:
            results = pickle.loads(results)

        return results
