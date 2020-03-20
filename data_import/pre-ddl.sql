drop table if exists article_search cascade;
-- CREATE EXTENSION uint;
create table article_search (
    id                  SERIAL PRIMARY KEY,
    pub_year		    smallint,
    cite_in_01 uint1, cite_in_02 uint1, cite_in_03 uint1, cite_in_04 uint1, cite_in_05 uint1, cite_in_06 uint1, cite_in_07 uint1, cite_in_08 uint1, cite_in_09 uint1, cite_in_10 uint1, cite_in_11 uint1, cite_in_12 uint1, cite_in_13 uint1, cite_in_14 uint1, cite_in_15 uint1, cite_in_16 uint1, cite_in_17 uint1, cite_in_18 uint1, cite_in_19 uint1, cite_in_20 uint1, cite_in_21 uint1, cite_in_22 uint1, cite_in_23 uint1, cite_in_24 uint1, cite_in_25 uint1, cite_in_26 uint1, cite_in_27 uint1, cite_in_28 uint1, cite_in_29 uint1, cite_in_30 uint1, cite_in_31 uint1, cite_in_32 uint1, cite_in_33 uint1, cite_in_34 uint1, cite_in_35 uint1, cite_in_36 uint1, cite_in_37 uint1, cite_in_38 uint1, cite_in_39 uint1, cite_in_40 uint1, cite_in_41 uint1, cite_in_42 uint1, cite_in_43 uint1, cite_in_44 uint1, cite_in_45 uint1, cite_in_46 uint1, cite_in_47 uint1, cite_in_48 uint1, cite_in_49 uint1, cite_in_50 uint1, cite_in_51 uint1, cite_in_52 uint1, cite_in_53 uint1, cite_in_54 uint1, cite_in_55 uint1, cite_in_56 uint1, cite_in_57 uint1, cite_in_58 uint1, cite_in_59 uint1, cite_in_60 uint1, cite_in_61 uint1, cite_in_62 uint1, cite_in_63 uint1, cite_in_64 uint1, cite_in_65 uint1, cite_in_66 uint1, cite_in_67 uint1, cite_in_68 uint1, cite_in_69 uint1, cite_in_70 uint1, cite_in_71 uint1, cite_in_72 uint1, cite_in_73 uint1, cite_in_74 uint1, cite_in_75 uint1, cite_in_76 uint1, cite_in_77 uint1, cite_in_78 uint1, cite_in_79 uint1, cite_in_80 uint1, cite_in_81 uint1, cite_in_82 uint1, cite_in_83 uint1, cite_in_84 uint1, cite_in_85 uint1, cite_in_86 uint1, cite_in_87 uint1, cite_in_88 uint1, cite_in_89 uint1, cite_in_90 uint1, cite_in_91 uint1, cite_in_92 uint1, cite_in_93 uint1, cite_in_94 uint1, cite_in_95 uint1, cite_in_96 uint1, cite_in_97 uint1, cite_in_98 uint1, cite_in_99 uint1, cite_in_100 uint1,
    text_search	        tsvector,
    cite_search         tsvector
);

drop table if exists article_search_2003;
drop table if exists article_search_2004;
drop table if exists article_search_2005;
drop table if exists article_search_2006;
drop table if exists article_search_2007;
drop table if exists article_search_2008;
drop table if exists article_search_2009;
drop table if exists article_search_2010;
drop table if exists article_search_2011;
drop table if exists article_search_2012;
drop table if exists article_search_2013;
drop table if exists article_search_2014;
drop table if exists article_search_2015;
drop table if exists article_search_2016;
drop table if exists article_search_2017;
drop table if exists article_search_2018;
drop table if exists article_search_2019;
drop table if exists article_search_2020;
create table article_search_2003 () inherits(article_search);
create table article_search_2004 () inherits(article_search);
create table article_search_2005 () inherits(article_search);
create table article_search_2006 () inherits(article_search);
create table article_search_2007 () inherits(article_search);
create table article_search_2008 () inherits(article_search);
create table article_search_2009 () inherits(article_search);
create table article_search_2010 () inherits(article_search);
create table article_search_2011 () inherits(article_search);
create table article_search_2012 () inherits(article_search);
create table article_search_2013 () inherits(article_search);
create table article_search_2014 () inherits(article_search);
create table article_search_2015 () inherits(article_search);
create table article_search_2016 () inherits(article_search);
create table article_search_2017 () inherits(article_search);
create table article_search_2018 () inherits(article_search);
create table article_search_2019 () inherits(article_search);
create table article_search_2020 () inherits(article_search);



create or replace function on_article_insert() returns trigger as $$
BEGIN
	EXECUTE format('INSERT INTO article_search_%s (id, pub_year,cite_in_01, cite_in_02, cite_in_03, cite_in_04, cite_in_05, cite_in_06, cite_in_07, cite_in_08, cite_in_09, cite_in_10, cite_in_11, cite_in_12, cite_in_13, cite_in_14, cite_in_15, cite_in_16, cite_in_17, cite_in_18, cite_in_19, cite_in_20, cite_in_21, cite_in_22, cite_in_23, cite_in_24, cite_in_25, cite_in_26, cite_in_27, cite_in_28, cite_in_29, cite_in_30, cite_in_31, cite_in_32, cite_in_33, cite_in_34, cite_in_35, cite_in_36, cite_in_37, cite_in_38, cite_in_39, cite_in_40, cite_in_41, cite_in_42, cite_in_43, cite_in_44, cite_in_45, cite_in_46, cite_in_47, cite_in_48, cite_in_49, cite_in_50, cite_in_51, cite_in_52, cite_in_53, cite_in_54, cite_in_55, cite_in_56, cite_in_57, cite_in_58, cite_in_59, cite_in_60, cite_in_61, cite_in_62, cite_in_63, cite_in_64, cite_in_65, cite_in_66, cite_in_67, cite_in_68, cite_in_69, cite_in_70, cite_in_71, cite_in_72, cite_in_73, cite_in_74, cite_in_75, cite_in_76, cite_in_77, cite_in_78, cite_in_79, cite_in_80, cite_in_81, cite_in_82, cite_in_83, cite_in_84, cite_in_85, cite_in_86, cite_in_87, cite_in_88, cite_in_89, cite_in_90, cite_in_91, cite_in_92, cite_in_93, cite_in_94, cite_in_95, cite_in_96, cite_in_97, cite_in_98, cite_in_99, cite_in_100, text_search, cite_search)
	values ($1,$2,$3,$4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104)'::text, new.pub_year) 
		using new.id, new.pub_year, new.cite_in_01, new.cite_in_02, new.cite_in_03, new.cite_in_04, new.cite_in_05, new.cite_in_06, new.cite_in_07, new.cite_in_08, new.cite_in_09, new.cite_in_10, new.cite_in_11, new.cite_in_12, new.cite_in_13, new.cite_in_14, new.cite_in_15, new.cite_in_16, new.cite_in_17, new.cite_in_18, new.cite_in_19, new.cite_in_20, new.cite_in_21, new.cite_in_22, new.cite_in_23, new.cite_in_24, new.cite_in_25, new.cite_in_26, new.cite_in_27, new.cite_in_28, new.cite_in_29, new.cite_in_30, new.cite_in_31, new.cite_in_32, new.cite_in_33, new.cite_in_34, new.cite_in_35, new.cite_in_36, new.cite_in_37, new.cite_in_38, new.cite_in_39, new.cite_in_40, new.cite_in_41, new.cite_in_42, new.cite_in_43, new.cite_in_44, new.cite_in_45, new.cite_in_46, new.cite_in_47, new.cite_in_48, new.cite_in_49, new.cite_in_50, new.cite_in_51, new.cite_in_52, new.cite_in_53, new.cite_in_54, new.cite_in_55, new.cite_in_56, new.cite_in_57, new.cite_in_58, new.cite_in_59, new.cite_in_60, new.cite_in_61, new.cite_in_62, new.cite_in_63, new.cite_in_64, new.cite_in_65, new.cite_in_66, new.cite_in_67, new.cite_in_68, new.cite_in_69, new.cite_in_70, new.cite_in_71, new.cite_in_72, new.cite_in_73, new.cite_in_74, new.cite_in_75, new.cite_in_76, new.cite_in_77, new.cite_in_78, new.cite_in_79, new.cite_in_80, new.cite_in_81, new.cite_in_82, new.cite_in_83, new.cite_in_84, new.cite_in_85, new.cite_in_86, new.cite_in_87, new.cite_in_88, new.cite_in_89, new.cite_in_90, new.cite_in_91, new.cite_in_92, new.cite_in_93, new.cite_in_94, new.cite_in_95, new.cite_in_96, new.cite_in_97, new.cite_in_98, new.cite_in_99, new.cite_in_100, new.text_search, new.cite_search;
	return null;
END
$$ language plpgsql;

create trigger article_search_insert
    before insert on article_search
    for each row execute procedure on_article_insert();




drop table if exists article_text cascade;
create table article_text (
    id              SERIAL PRIMARY KEY,
    pub_year		smallint,
    title 		    varchar,
    abstract		varchar,
    general         jsonb,
    sections        jsonb
);

drop table if exists article_text_2003;
drop table if exists article_text_2004;
drop table if exists article_text_2005;
drop table if exists article_text_2006;
drop table if exists article_text_2007;
drop table if exists article_text_2008;
drop table if exists article_text_2009;
drop table if exists article_text_2010;
drop table if exists article_text_2011;
drop table if exists article_text_2012;
drop table if exists article_text_2013;
drop table if exists article_text_2014;
drop table if exists article_text_2015;
drop table if exists article_text_2016;
drop table if exists article_text_2017;
drop table if exists article_text_2018;
drop table if exists article_text_2019;
drop table if exists article_text_2020;
create table article_text_2003 () inherits(article_text);
create table article_text_2004 () inherits(article_text);
create table article_text_2005 () inherits(article_text);
create table article_text_2006 () inherits(article_text);
create table article_text_2007 () inherits(article_text);
create table article_text_2008 () inherits(article_text);
create table article_text_2009 () inherits(article_text);
create table article_text_2010 () inherits(article_text);
create table article_text_2011 () inherits(article_text);
create table article_text_2012 () inherits(article_text);
create table article_text_2013 () inherits(article_text);
create table article_text_2014 () inherits(article_text);
create table article_text_2015 () inherits(article_text);
create table article_text_2016 () inherits(article_text);
create table article_text_2017 () inherits(article_text);
create table article_text_2018 () inherits(article_text);
create table article_text_2019 () inherits(article_text);
create table article_text_2020 () inherits(article_text);



create or replace function on_article_text_insert() returns trigger as $$
BEGIN
	EXECUTE format('INSERT INTO article_text_%s (id, pub_year, title, abstract, general, sections) VALUES ($1, $2, $3, $4, $5, $6)'::text, new.pub_year) 
		using new.id, new.pub_year, new.title, new.abstract, new.general, new.sections;
	return null;
END
$$ language plpgsql;

create trigger article_text_insert
    before insert on article_text
    for each row execute procedure on_article_text_insert();




drop table if exists query_cache;
CREATE TABLE query_cache (
    id uuid primary KEY,
    data bytea NOT NULL
);

drop table if exists signalcategory;
CREATE TABLE signalcategory (
	id      serial PRIMARY KEY,
	catname varchar NOT NULL,
	cookieid varchar NOT NULL,
	color varchar NOT NULL DEFAULT '#ffffff'
);

drop table if exists signal;
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
);

drop table if exists journals;
CREATE TABLE journals (
	id serial primary key,
	journal_name varchar NOT NULL,
	journal_type varchar NULL
);

