DROP INDEX IF EXISTS article_search_text_2003;
DROP INDEX IF EXISTS article_search_text_2004;
DROP INDEX IF EXISTS article_search_text_2005;
DROP INDEX IF EXISTS article_search_text_2006;
DROP INDEX IF EXISTS article_search_text_2007;
DROP INDEX IF EXISTS article_search_text_2008;
DROP INDEX IF EXISTS article_search_text_2009;
DROP INDEX IF EXISTS article_search_text_2010;
DROP INDEX IF EXISTS article_search_text_2011;
DROP INDEX IF EXISTS article_search_text_2012;
DROP INDEX IF EXISTS article_search_text_2013;
DROP INDEX IF EXISTS article_search_text_2014;
DROP INDEX IF EXISTS article_search_text_2015;
DROP INDEX IF EXISTS article_search_text_2016;
DROP INDEX IF EXISTS article_search_text_2017;
DROP INDEX IF EXISTS article_search_text_2018;
DROP INDEX IF EXISTS article_search_text_2019;
DROP INDEX IF EXISTS article_search_text_2020;
create index article_search_text_2003 on article_search_2003 using GIN(text_search);
create index article_search_text_2004 on article_search_2004 using GIN(text_search);
create index article_search_text_2005 on article_search_2005 using GIN(text_search);
create index article_search_text_2006 on article_search_2006 using GIN(text_search);
create index article_search_text_2007 on article_search_2007 using GIN(text_search);
create index article_search_text_2008 on article_search_2008 using GIN(text_search);
create index article_search_text_2009 on article_search_2009 using GIN(text_search);
create index article_search_text_2010 on article_search_2010 using GIN(text_search);
create index article_search_text_2011 on article_search_2011 using GIN(text_search);
create index article_search_text_2012 on article_search_2012 using GIN(text_search);
create index article_search_text_2013 on article_search_2013 using GIN(text_search);
create index article_search_text_2014 on article_search_2014 using GIN(text_search);
create index article_search_text_2015 on article_search_2015 using GIN(text_search);
create index article_search_text_2016 on article_search_2016 using GIN(text_search);
create index article_search_text_2017 on article_search_2017 using GIN(text_search);
create index article_search_text_2018 on article_search_2018 using GIN(text_search);
create index article_search_text_2019 on article_search_2019 using GIN(text_search);
create index article_search_text_2020 on article_search_2020 using GIN(text_search);


DROP INDEX IF EXISTS article_search_citations_2003;
DROP INDEX IF EXISTS article_search_citations_2004;
DROP INDEX IF EXISTS article_search_citations_2005;
DROP INDEX IF EXISTS article_search_citations_2006;
DROP INDEX IF EXISTS article_search_citations_2007;
DROP INDEX IF EXISTS article_search_citations_2008;
DROP INDEX IF EXISTS article_search_citations_2009;
DROP INDEX IF EXISTS article_search_citations_2010;
DROP INDEX IF EXISTS article_search_citations_2011;
DROP INDEX IF EXISTS article_search_citations_2012;
DROP INDEX IF EXISTS article_search_citations_2013;
DROP INDEX IF EXISTS article_search_citations_2014;
DROP INDEX IF EXISTS article_search_citations_2015;
DROP INDEX IF EXISTS article_search_citations_2016;
DROP INDEX IF EXISTS article_search_citations_2017;
DROP INDEX IF EXISTS article_search_citations_2018;
DROP INDEX IF EXISTS article_search_citations_2019;
DROP INDEX IF EXISTS article_search_citations_2020;
create index article_search_citations_2003 on article_search_2003 using GIN(cite_search);
create index article_search_citations_2004 on article_search_2004 using GIN(cite_search);
create index article_search_citations_2005 on article_search_2005 using GIN(cite_search);
create index article_search_citations_2006 on article_search_2006 using GIN(cite_search);
create index article_search_citations_2007 on article_search_2007 using GIN(cite_search);
create index article_search_citations_2008 on article_search_2008 using GIN(cite_search);
create index article_search_citations_2009 on article_search_2009 using GIN(cite_search);
create index article_search_citations_2010 on article_search_2010 using GIN(cite_search);
create index article_search_citations_2011 on article_search_2011 using GIN(cite_search);
create index article_search_citations_2012 on article_search_2012 using GIN(cite_search);
create index article_search_citations_2013 on article_search_2013 using GIN(cite_search);
create index article_search_citations_2014 on article_search_2014 using GIN(cite_search);
create index article_search_citations_2015 on article_search_2015 using GIN(cite_search);
create index article_search_citations_2016 on article_search_2016 using GIN(cite_search);
create index article_search_citations_2017 on article_search_2017 using GIN(cite_search);
create index article_search_citations_2018 on article_search_2018 using GIN(cite_search);
create index article_search_citations_2019 on article_search_2019 using GIN(cite_search);
create index article_search_citations_2020 on article_search_2020 using GIN(cite_search);


ALTER TABLE article_search 
    ALTER COLUMN cite_in_01 TYPE smallint,
    ALTER COLUMN cite_in_02 TYPE smallint,
    ALTER COLUMN cite_in_03 TYPE smallint,
    ALTER COLUMN cite_in_04 TYPE smallint,
    ALTER COLUMN cite_in_05 TYPE smallint,
    ALTER COLUMN cite_in_06 TYPE smallint,
    ALTER COLUMN cite_in_07 TYPE smallint,
    ALTER COLUMN cite_in_08 TYPE smallint,
    ALTER COLUMN cite_in_09 TYPE smallint,
    ALTER COLUMN cite_in_10 TYPE smallint,
    ALTER COLUMN cite_in_11 TYPE smallint,
    ALTER COLUMN cite_in_12 TYPE smallint,
    ALTER COLUMN cite_in_13 TYPE smallint,
    ALTER COLUMN cite_in_14 TYPE smallint,
    ALTER COLUMN cite_in_15 TYPE smallint,
    ALTER COLUMN cite_in_16 TYPE smallint,
    ALTER COLUMN cite_in_17 TYPE smallint,
    ALTER COLUMN cite_in_18 TYPE smallint,
    ALTER COLUMN cite_in_19 TYPE smallint,
    ALTER COLUMN cite_in_20 TYPE smallint,
    ALTER COLUMN cite_in_21 TYPE smallint,
    ALTER COLUMN cite_in_22 TYPE smallint,
    ALTER COLUMN cite_in_23 TYPE smallint,
    ALTER COLUMN cite_in_24 TYPE smallint,
    ALTER COLUMN cite_in_25 TYPE smallint,
    ALTER COLUMN cite_in_26 TYPE smallint,
    ALTER COLUMN cite_in_27 TYPE smallint,
    ALTER COLUMN cite_in_28 TYPE smallint,
    ALTER COLUMN cite_in_29 TYPE smallint,
    ALTER COLUMN cite_in_30 TYPE smallint,
    ALTER COLUMN cite_in_31 TYPE smallint,
    ALTER COLUMN cite_in_32 TYPE smallint,
    ALTER COLUMN cite_in_33 TYPE smallint,
    ALTER COLUMN cite_in_34 TYPE smallint,
    ALTER COLUMN cite_in_35 TYPE smallint,
    ALTER COLUMN cite_in_36 TYPE smallint,
    ALTER COLUMN cite_in_37 TYPE smallint,
    ALTER COLUMN cite_in_38 TYPE smallint,
    ALTER COLUMN cite_in_39 TYPE smallint,
    ALTER COLUMN cite_in_40 TYPE smallint,
    ALTER COLUMN cite_in_41 TYPE smallint,
    ALTER COLUMN cite_in_42 TYPE smallint,
    ALTER COLUMN cite_in_43 TYPE smallint,
    ALTER COLUMN cite_in_44 TYPE smallint,
    ALTER COLUMN cite_in_45 TYPE smallint,
    ALTER COLUMN cite_in_46 TYPE smallint,
    ALTER COLUMN cite_in_47 TYPE smallint,
    ALTER COLUMN cite_in_48 TYPE smallint,
    ALTER COLUMN cite_in_49 TYPE smallint,
    ALTER COLUMN cite_in_50 TYPE smallint,
    ALTER COLUMN cite_in_51 TYPE smallint,
    ALTER COLUMN cite_in_52 TYPE smallint,
    ALTER COLUMN cite_in_53 TYPE smallint,
    ALTER COLUMN cite_in_54 TYPE smallint,
    ALTER COLUMN cite_in_55 TYPE smallint,
    ALTER COLUMN cite_in_56 TYPE smallint,
    ALTER COLUMN cite_in_57 TYPE smallint,
    ALTER COLUMN cite_in_58 TYPE smallint,
    ALTER COLUMN cite_in_59 TYPE smallint,
    ALTER COLUMN cite_in_60 TYPE smallint,
    ALTER COLUMN cite_in_61 TYPE smallint,
    ALTER COLUMN cite_in_62 TYPE smallint,
    ALTER COLUMN cite_in_63 TYPE smallint,
    ALTER COLUMN cite_in_64 TYPE smallint,
    ALTER COLUMN cite_in_65 TYPE smallint,
    ALTER COLUMN cite_in_66 TYPE smallint,
    ALTER COLUMN cite_in_67 TYPE smallint,
    ALTER COLUMN cite_in_68 TYPE smallint,
    ALTER COLUMN cite_in_69 TYPE smallint,
    ALTER COLUMN cite_in_70 TYPE smallint,
    ALTER COLUMN cite_in_71 TYPE smallint,
    ALTER COLUMN cite_in_72 TYPE smallint,
    ALTER COLUMN cite_in_73 TYPE smallint,
    ALTER COLUMN cite_in_74 TYPE smallint,
    ALTER COLUMN cite_in_75 TYPE smallint,
    ALTER COLUMN cite_in_76 TYPE smallint,
    ALTER COLUMN cite_in_77 TYPE smallint,
    ALTER COLUMN cite_in_78 TYPE smallint,
    ALTER COLUMN cite_in_79 TYPE smallint,
    ALTER COLUMN cite_in_80 TYPE smallint,
    ALTER COLUMN cite_in_81 TYPE smallint,
    ALTER COLUMN cite_in_82 TYPE smallint,
    ALTER COLUMN cite_in_83 TYPE smallint,
    ALTER COLUMN cite_in_84 TYPE smallint,
    ALTER COLUMN cite_in_85 TYPE smallint,
    ALTER COLUMN cite_in_86 TYPE smallint,
    ALTER COLUMN cite_in_87 TYPE smallint,
    ALTER COLUMN cite_in_88 TYPE smallint,
    ALTER COLUMN cite_in_89 TYPE smallint,
    ALTER COLUMN cite_in_90 TYPE smallint,
    ALTER COLUMN cite_in_91 TYPE smallint,
    ALTER COLUMN cite_in_92 TYPE smallint,
    ALTER COLUMN cite_in_93 TYPE smallint,
    ALTER COLUMN cite_in_94 TYPE smallint,
    ALTER COLUMN cite_in_95 TYPE smallint,
    ALTER COLUMN cite_in_96 TYPE smallint,
    ALTER COLUMN cite_in_97 TYPE smallint,
    ALTER COLUMN cite_in_98 TYPE smallint,
    ALTER COLUMN cite_in_99 TYPE smallint,
    ALTER COLUMN cite_in_100 TYPE smallint;



VACUUM ANALYZE;

