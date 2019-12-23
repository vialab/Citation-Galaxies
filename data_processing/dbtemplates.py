"""
    I Used this file to quickly fill in templates of sql definitions.
"""

art_tbl = """create table article_search_{} (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );"""

art_text_tbl = """create table article_text_{} (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    sections        jsonb,
    pub_year		smallint
 ) inherits( article_text );"""

for i in range(100):
    # print( f'cite_in_{i+1:02d} smallint,',sep=' ',end=' ')
    print( f'\'sum(cite_in_{i+1:02d}) as c{i}\',',sep=' ',end=' ')
    # print( f'${i+4},',sep=' ',end=' ')
    pass

for i in range(2003,2020):
    # print(art_tbl.format(i))
    # print(art_text_tbl.format(i))
    pass


index_tmpl = """create index article_search_ts_{} on article_search_{} using GIN(ts_search);"""

for i in range(2003,2020):
    # print(index_tmpl.format(i,i))
    pass