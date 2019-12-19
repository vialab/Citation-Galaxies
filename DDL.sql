
-- Drop table

-- DROP TABLE article;

CREATE TABLE article (
	id varchar(255) NOT NULL,
	articletitle varchar(1000000) NULL,
	articleyear int4 NULL,
	charcount int4 NULL,
	journaltitle varchar(1000000) NULL,
	papertext varchar(10485760) NULL,
	doi varchar NULL,
	pmc varchar NULL,
	authors varchar NULL,
	fauthor varchar NULL,
	filename varchar NULL,
	journalid int4 NULL,
	CONSTRAINT article_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE citation_ref;

CREATE TABLE citation_ref (
	articleid varchar NULL,
	citationid varchar NULL,
	reference_id int4 NULL
);
CREATE INDEX ix_articleid ON public.citation_ref USING btree (articleid);
CREATE INDEX ix_citation ON public.citation_ref USING btree (articleid, citationid);

-- Drop table

-- DROP TABLE citationmeta;

CREATE TABLE citationmeta (
	id serial NOT NULL,
	articletitle varchar(1000000) NULL,
	authors varchar(1000000) NULL,
	citationnumpaper int4 NULL,
	"year" varchar(1000000) NULL,
	CONSTRAINT citationmeta_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE citationsearch;

CREATE TABLE citationsearch (
	startlocationpaper int4 NULL,
	endlocationpaper int4 NULL,
	sentencenum int4 NULL,
	articleid varchar(255) NULL,
	articleyear int4 NULL,
	citationauthors text NULL,
	citationyear varchar(255) NULL,
	citationarticletitle text NULL
);
CREATE INDEX citationindex ON public.citationsearch USING btree (articleid, articleyear, sentencenum);

-- Drop table

-- DROP TABLE journal;

CREATE TABLE journal (
	id serial NOT NULL,
	journaltitle varchar NULL,
	articlecount int4 NULL
);

-- Drop table

-- DROP TABLE querycache;

CREATE TABLE querycache (
	queryid varchar NOT NULL,
	querydate timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	querydata varchar NULL,
	CONSTRAINT querycache_pkey PRIMARY KEY (queryid),
	CONSTRAINT "unique queries" UNIQUE (queryid)
);
CREATE INDEX search ON public.querycache USING btree (queryid);

-- Drop table

-- DROP TABLE reference;

CREATE TABLE reference (
	id serial NOT NULL,
	pmid varchar NULL,
	pmc varchar NULL,
	doi varchar NULL,
	raw varchar NULL,
	articletitle varchar NULL,
	articlesource varchar NULL,
	fauthor varchar NULL,
	authors varchar NULL,
	articleyear int4 NULL,
	article_id varchar NULL,
	referencetype varchar NULL,
	CONSTRAINT reference_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE signal;

CREATE TABLE signal (
	id serial NOT NULL,
	signal varchar NULL,
	score varchar NULL,
	signalcategoryid int4 NULL,
	enabled bool NULL,
	cookieid varchar NULL,
	signaltypeid int4 NULL,
	distance int4 NULL,
	parentid int4 NULL
);

-- Drop table

-- DROP TABLE signalcategory;

CREATE TABLE signalcategory (
	id serial NOT NULL,
	catname varchar NULL,
	score int4 NULL,
	enabled bool NULL,
	cookieid varchar NULL,
	color varchar NULL
);

-- Drop table

-- DROP TABLE signaltype;

CREATE TABLE signaltype (
	id serial NOT NULL,
	"name" varchar NULL,
	"type" int4 NULL,
	psignalid int4 NULL,
	CONSTRAINT signaltype_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE temp_article;

CREATE TABLE temp_article (
	id varchar(255) NOT NULL,
	articletitle varchar(1000000) NULL,
	articleyear int4 NULL,
	charcount int4 NULL,
	journaltitle varchar(1000000) NULL,
	papertext varchar(10485760) NULL,
	doi varchar NULL,
	pmc varchar NULL,
	authors varchar NULL,
	fauthor varchar NULL,
	filename varchar NULL,
	CONSTRAINT temp_article_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE temp_citation;

CREATE TABLE temp_citation (
	id int4 NULL,
	citationid varchar(10485760) NULL,
	endlocationpaper int4 NULL,
	endlocationpara int4 NULL,
	startlocationpaper int4 NULL,
	startlocationpara int4 NULL,
	articleid_id varchar(255) NULL,
	citationmeta_id int4 NULL,
	paragraphid_id int4 NULL,
	sentence_id int4 NULL,
	reference_id int4 NULL
);
CREATE INDEX article_citation ON public.temp_citation USING btree (articleid_id, citationid);

-- Drop table

-- DROP TABLE temp_citationmeta;

CREATE TABLE temp_citationmeta (
	id int4 NULL,
	articletitle varchar(1000000) NULL,
	authors varchar(1000000) NULL,
	citationnumpaper int4 NULL,
	"year" varchar(1000000) NULL,
	articleid varchar(255) NULL
);

-- Drop table

-- DROP TABLE whoosh;

CREATE TABLE whoosh (
	id varchar NOT NULL,
	CONSTRAINT whoosh_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE wordsearch;

CREATE TABLE wordsearch (
	term text NULL,
	lemma text NULL,
	startlocationpaper int4 NULL,
	endlocationpaper int4 NULL,
	sentencenum int4 NULL,
	articleid varchar(255) NULL,
	articleyear int4 NULL,
	articlecharcount int4 NULL
);
CREATE INDEX wordindex ON public.wordsearch USING btree (lemma, articleyear, sentencenum);

-- Drop table

-- DROP TABLE "section";

CREATE TABLE "section" (
	id serial NOT NULL,
	endlocationpaper int4 NULL,
	sectionid text NULL,
	sectiontitle text NULL,
	startlocationpaper int4 NULL,
	articleid_id varchar(255) NULL,
	CONSTRAINT section_pkey PRIMARY KEY (id),
	CONSTRAINT fk_section_articleid_id FOREIGN KEY (articleid_id) REFERENCES article(id)
);

-- Drop table

-- DROP TABLE paragraph;

CREATE TABLE paragraph (
	id serial NOT NULL,
	charcount int4 NULL,
	endlocationpaper int4 NULL,
	sentencecount int4 NULL,
	startlocationpaper int4 NULL,
	articleid_id varchar(255) NULL,
	sectionid_id int4 NULL,
	CONSTRAINT paragraph_pkey PRIMARY KEY (id),
	CONSTRAINT fk_paragraph_articleid_id FOREIGN KEY (articleid_id) REFERENCES article(id),
	CONSTRAINT fk_paragraph_sectionid_id FOREIGN KEY (sectionid_id) REFERENCES section(id)
);

-- Drop table

-- DROP TABLE sentence;

CREATE TABLE sentence (
	id serial NOT NULL,
	endlocationpaper int4 NULL,
	endlocationpara int4 NULL,
	sentencenum int4 NULL,
	startlocationpaper int4 NULL,
	startlocationpara int4 NULL,
	para_id int4 NULL,
	CONSTRAINT sentence_pkey PRIMARY KEY (id),
	CONSTRAINT fk_sentence_para_id FOREIGN KEY (para_id) REFERENCES paragraph(id)
);

-- Drop table

-- DROP TABLE word;

CREATE TABLE word (
	id serial NOT NULL,
	endlocationpaper int4 NULL,
	endlocationpara int4 NULL,
	lemma text NULL,
	startlocationpaper int4 NULL,
	startlocationpara int4 NULL,
	term text NULL,
	articleid_id varchar(255) NULL,
	paragraphid_id int4 NULL,
	sentence_id int4 NULL,
	CONSTRAINT word_pkey PRIMARY KEY (id),
	CONSTRAINT fk_word_articleid_id FOREIGN KEY (articleid_id) REFERENCES article(id),
	CONSTRAINT fk_word_paragraphid_id FOREIGN KEY (paragraphid_id) REFERENCES paragraph(id),
	CONSTRAINT fk_word_sentence_id FOREIGN KEY (sentence_id) REFERENCES sentence(id)
);

-- Drop table

-- DROP TABLE citation;

CREATE TABLE citation (
	id serial NOT NULL,
	citationid varchar(10485760) NULL,
	endlocationpaper int4 NULL,
	endlocationpara int4 NULL,
	startlocationpaper int4 NULL,
	startlocationpara int4 NULL,
	articleid_id varchar(255) NULL,
	citationmeta_id int4 NULL,
	paragraphid_id int4 NULL,
	sentence_id int4 NULL,
	reference_id int4 NULL,
	CONSTRAINT citation_pkey PRIMARY KEY (id),
	CONSTRAINT fk_citation_articleid_id FOREIGN KEY (articleid_id) REFERENCES article(id),
	CONSTRAINT fk_citation_citationmeta_id FOREIGN KEY (citationmeta_id) REFERENCES citationmeta(id),
	CONSTRAINT fk_citation_paragraphid_id FOREIGN KEY (paragraphid_id) REFERENCES paragraph(id),
	CONSTRAINT fk_citation_sentence_id FOREIGN KEY (sentence_id) REFERENCES sentence(id)
);
CREATE INDEX article_cit ON public.citation USING btree (articleid_id, citationid);
COMMENT ON INDEX public.article_cit IS 'article by citation ';
CREATE INDEX ix_byarticle ON public.citation USING btree (articleid_id);
