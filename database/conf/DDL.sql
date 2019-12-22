drop table if exists article_search cascade;

create table article_search (
    id              SERIAL PRIMARY KEY,
    ts_search	    tsvector,
    pub_year		smallint
 );

create table article_search_2003 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2004 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2005 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2006 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2007 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2008 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2009 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2010 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2011 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2012 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2013 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2014 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2015 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2016 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2017 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2018 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );
create table article_search_2019 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint
 ) inherits( article_search );


create or replace function on_article_insert() returns trigger as $$
BEGIN
	EXECUTE format('INSERT INTO article_search_%s (id,ts_search, pub_year) values ($1,$2,$3)'::text, new.pub_year) 
		using new.id, new.ts_search, new.pub_year;
	return null;
END
$$ language plpgsql;

create trigger article_search_insert
    before insert on article_search
    for each row execute procedure on_article_insert();






drop table if exists article_text cascade;

create table article_text (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			varchar,
    pub_year		smallint
 );

create table article_text_2003 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2004 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2005 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2006 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2007 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2008 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2009 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2010 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2011 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2012 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2013 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2014 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2015 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2016 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2017 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2018 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			VARCHAR,
    pub_year		smallint
 ) inherits( article_text );
create table article_text_2019 (
    id              SERIAL PRIMARY KEY,
    title 		    varchar,
    abstract		varchar,
    body  			varchar,
    pub_year		smallint
 ) inherits( article_text );


create or replace function on_article_text_insert() returns trigger as $$
BEGIN
	EXECUTE format('INSERT INTO article_text_%s (id,title, abstract, body, pub_year ) values ($1,$2,$3,$4,$5)'::text, new.pub_year) 
		using new.id, new.title, new.abstract, new.body, new.pub_year;
	return null;
END
$$ language plpgsql;

create trigger on_article_text_insert
    before insert on article_text
    for each row execute procedure on_article_text_insert();