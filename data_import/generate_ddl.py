"""
    I Used this file to quickly fill in templates of sql definitions.
"""

# import datetime
from datetime import datetime

now = datetime.now()
cur_year = now.year
year_range = list( range(now.year-17, now.year+1) )

# Base SQL definitions, entire tables stems from this.
# In-order of execution.
prepopulate_templates = [
    {
        "name": "Article Search",
        "drop": "drop table if exists article_search;",
        "sql": """
create table article_search (
    id                  SERIAL PRIMARY KEY,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint,
    text_search	        tsvector,
    cite_search         tsvector
);"""
    },
    {
        "name": "Article Search Children",
        "drop": "drop table if exists article_search_{};",
        "sql": "create table article_search_{} () inherits(article_search);",
        "templater": lambda sql: '\n'.join( (sql.format(year) for year in year_range) ) + '\n'
    },
    {
        "name": "Article Text",
        "drop": "drop table if exists article_text;",
        "sql": """
create table article_text (
    id              SERIAL PRIMARY KEY,
    pub_year		smallint,
    title 		    varchar,
    abstract		varchar,
    general         jsonb,
    sections        jsonb
);"""
    },
    {
        "name": "Article Text Children",
        "drop": "drop table if exists article_text_{};",
        "sql": "create table article_text_{} () inherits(article_text);",
        "templater": lambda sql: '\n'.join( (sql.format(year) for year in year_range) ) + '\n'
    },
    {
        "name": "Query Cache",
        "drop": "drop table if exists query_cache;",
        "sql":"""
CREATE TABLE query_cache (
    id uuid primary KEY,
    data bytea NOT NULL
);"""
    },
    {
        "name": "signalcategory",
        "drop": "drop table if exists signalcategory;",
        "sql":"""
CREATE TABLE signalcategory (
	id      serial PRIMARY KEY,
	catname varchar NOT NULL,
	cookieid varchar NOT NULL,
	color varchar NOT NULL DEFAULT '#ffffff'
);"""
    },
    {
        "name": "signal",
        "drop": "drop table if exists signal;",
        "sql":"""
CREATE TABLE signal (
	id serial primary key,
	signal varchar NULL,
	score varchar NULL,
	signalcategoryid int4 NULL,
	enabled bool NULL DEFAULT true,
	cookieid varchar NULL,
	signaltypeid int4 NULL,
	distance int4 NULL,
	parentid int4 NULL
);"""
    },
    {
        "name": "Journals",
        "drop": "drop table if exists journals;",
        "sql":"""
CREATE TABLE journals (
	id serial primary key,
	journal_name varchar NOT NULL,
	journal_type varchar NULL
);"""
    },
    # {
    #     "name":
    #     "sql":
    # },
    # {
    #     "name":
    #     "sql":
    # },
    
]


# ddl of stuff to run after populating DB.
postpopulate_template = [
    {
        "name": "Article Search Text Search Index",
        "drop": "DROP INDEX IF EXISTS article_search_text_{}",
        "sql": """create index article_search_text_{} on article_search_{} using GIN(text_search);""",
        "templater": lambda sql: '\n'.join( (sql.format(year,year) for year in year_range) ) +'\n'
    },
    {
        "name": "Article Search Citation Search Index",
        "drop": "DROP INDEX IF EXISTS article_search_citations_{}",
        "sql": """create index article_search_citations_{} on article_search_{} using GIN(cite_search);""",
        "templater": lambda sql: '\n'.join( (sql.format(year,year) for year in year_range) ) + '\n'
    },
    # {
    #     "name": 
    #     "sql":
    # },
    # {
    #     "name": 
    #     "sql":
    # },
    # {
    #     "name": 
    #     "sql":
    # }
]

def create_ddl( templates ):
    sqllist = []
    for entry in templates:
        if entry.get('templater',False):
            
            sqllist.append( entry['templater']( entry['drop'] ) )
            sqllist.append( entry['templater']( entry['sql'] ) )
            sqllist.append( '\n\n' )

        else:
            sqllist.append( entry['drop'] )
            sqllist.append( entry['sql'] )
            sqllist.append( '\n\n' )

    return ''.join( sqllist )


def create_pre_ddl():
    return create_ddl(prepopulate_templates)

def create_post_ddl():
    return create_ddl(postpopulate_template)


def write_ddls(path=''):
    with open(path+'pre-ddl.sql','w') as fp:
        fp.write( create_ddl(prepopulate_templates) )
    
    with open(path+'post-ddl.sql','w') as fp:
        fp.write( create_ddl(postpopulate_template) )


if __name__ == "__main__":
    write_ddls()