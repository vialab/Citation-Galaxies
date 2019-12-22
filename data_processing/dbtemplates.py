
art_tbl = """create table article_search_{} (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    text                varchar,
    pub_year		    smallint
 ) inherits( article_search );"""

art_text_tbl = """create table article_text_{} (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );"""

# for i in range(100):
#     print( f'occurences_in_{i+1:02d}\tsmallint,')

for i in range(2003,2020):
    print(art_text_tbl.format(i))
    pass


index_tmpl = """create index article_search_ts_{} on article_search_{} using GIN(ts_search);"""

for i in range(2003,2020):
    # print(index_tmpl.format(i,i))
    pass