drop table if exists article_search cascade;

create table article_search (
    id              SERIAL PRIMARY KEY,
--    title 		    varchar,
--    abstract		varchar,
    ts_search	    tsvector,
    body  			VARCHAR,
    pub_year		smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 );

create table article_search_2003 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2004 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2005 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2006 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2007 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2008 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2009 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2010 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2011 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2012 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2013 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2014 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2015 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2016 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2017 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2018 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );
create table article_search_2019 (
    id                  SERIAL PRIMARY KEY,
    ts_search	        tsvector,
    pub_year		    smallint,
    cite_in_01 smallint, cite_in_02 smallint, cite_in_03 smallint, cite_in_04 smallint, cite_in_05 smallint, cite_in_06 smallint, cite_in_07 smallint, cite_in_08 smallint, cite_in_09 smallint, cite_in_10 smallint, cite_in_11 smallint, cite_in_12 smallint, cite_in_13 smallint, cite_in_14 smallint, cite_in_15 smallint, cite_in_16 smallint, cite_in_17 smallint, cite_in_18 smallint, cite_in_19 smallint, cite_in_20 smallint, cite_in_21 smallint, cite_in_22 smallint, cite_in_23 smallint, cite_in_24 smallint, cite_in_25 smallint, cite_in_26 smallint, cite_in_27 smallint, cite_in_28 smallint, cite_in_29 smallint, cite_in_30 smallint, cite_in_31 smallint, cite_in_32 smallint, cite_in_33 smallint, cite_in_34 smallint, cite_in_35 smallint, cite_in_36 smallint, cite_in_37 smallint, cite_in_38 smallint, cite_in_39 smallint, cite_in_40 smallint, cite_in_41 smallint, cite_in_42 smallint, cite_in_43 smallint, cite_in_44 smallint, cite_in_45 smallint, cite_in_46 smallint, cite_in_47 smallint, cite_in_48 smallint, cite_in_49 smallint, cite_in_50 smallint, cite_in_51 smallint, cite_in_52 smallint, cite_in_53 smallint, cite_in_54 smallint, cite_in_55 smallint, cite_in_56 smallint, cite_in_57 smallint, cite_in_58 smallint, cite_in_59 smallint, cite_in_60 smallint, cite_in_61 smallint, cite_in_62 smallint, cite_in_63 smallint, cite_in_64 smallint, cite_in_65 smallint, cite_in_66 smallint, cite_in_67 smallint, cite_in_68 smallint, cite_in_69 smallint, cite_in_70 smallint, cite_in_71 smallint, cite_in_72 smallint, cite_in_73 smallint, cite_in_74 smallint, cite_in_75 smallint, cite_in_76 smallint, cite_in_77 smallint, cite_in_78 smallint, cite_in_79 smallint, cite_in_80 smallint, cite_in_81 smallint, cite_in_82 smallint, cite_in_83 smallint, cite_in_84 smallint, cite_in_85 smallint, cite_in_86 smallint, cite_in_87 smallint, cite_in_88 smallint, cite_in_89 smallint, cite_in_90 smallint, cite_in_91 smallint, cite_in_92 smallint, cite_in_93 smallint, cite_in_94 smallint, cite_in_95 smallint, cite_in_96 smallint, cite_in_97 smallint, cite_in_98 smallint, cite_in_99 smallint, cite_in_100 smallint
 ) inherits( article_search );


create or replace function on_article_insert() returns trigger as $$
BEGIN
	EXECUTE format('INSERT INTO article_search_%s (id,ts_search, pub_year,cite_in_01, cite_in_02, cite_in_03, cite_in_04, cite_in_05, cite_in_06, cite_in_07, cite_in_08, cite_in_09, cite_in_10, cite_in_11, cite_in_12, cite_in_13, cite_in_14, cite_in_15, cite_in_16, cite_in_17, cite_in_18, cite_in_19, cite_in_20, cite_in_21, cite_in_22, cite_in_23, cite_in_24, cite_in_25, cite_in_26, cite_in_27, cite_in_28, cite_in_29, cite_in_30, cite_in_31, cite_in_32, cite_in_33, cite_in_34, cite_in_35, cite_in_36, cite_in_37, cite_in_38, cite_in_39, cite_in_40, cite_in_41, cite_in_42, cite_in_43, cite_in_44, cite_in_45, cite_in_46, cite_in_47, cite_in_48, cite_in_49, cite_in_50, cite_in_51, cite_in_52, cite_in_53, cite_in_54, cite_in_55, cite_in_56, cite_in_57, cite_in_58, cite_in_59, cite_in_60, cite_in_61, cite_in_62, cite_in_63, cite_in_64, cite_in_65, cite_in_66, cite_in_67, cite_in_68, cite_in_69, cite_in_70, cite_in_71, cite_in_72, cite_in_73, cite_in_74, cite_in_75, cite_in_76, cite_in_77, cite_in_78, cite_in_79, cite_in_80, cite_in_81, cite_in_82, cite_in_83, cite_in_84, cite_in_85, cite_in_86, cite_in_87, cite_in_88, cite_in_89, cite_in_90, cite_in_91, cite_in_92, cite_in_93, cite_in_94, cite_in_95, cite_in_96, cite_in_97, cite_in_98, cite_in_99, cite_in_100)
	values ($1,to_tsvector($2),$3,$4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103)'::text, new.pub_year) 
		using new.id, new.body, new.pub_year, new.cite_in_01, new.cite_in_02, new.cite_in_03, new.cite_in_04, new.cite_in_05, new.cite_in_06, new.cite_in_07, new.cite_in_08, new.cite_in_09, new.cite_in_10, new.cite_in_11, new.cite_in_12, new.cite_in_13, new.cite_in_14, new.cite_in_15, new.cite_in_16, new.cite_in_17, new.cite_in_18, new.cite_in_19, new.cite_in_20, new.cite_in_21, new.cite_in_22, new.cite_in_23, new.cite_in_24, new.cite_in_25, new.cite_in_26, new.cite_in_27, new.cite_in_28, new.cite_in_29, new.cite_in_30, new.cite_in_31, new.cite_in_32, new.cite_in_33, new.cite_in_34, new.cite_in_35, new.cite_in_36, new.cite_in_37, new.cite_in_38, new.cite_in_39, new.cite_in_40, new.cite_in_41, new.cite_in_42, new.cite_in_43, new.cite_in_44, new.cite_in_45, new.cite_in_46, new.cite_in_47, new.cite_in_48, new.cite_in_49, new.cite_in_50, new.cite_in_51, new.cite_in_52, new.cite_in_53, new.cite_in_54, new.cite_in_55, new.cite_in_56, new.cite_in_57, new.cite_in_58, new.cite_in_59, new.cite_in_60, new.cite_in_61, new.cite_in_62, new.cite_in_63, new.cite_in_64, new.cite_in_65, new.cite_in_66, new.cite_in_67, new.cite_in_68, new.cite_in_69, new.cite_in_70, new.cite_in_71, new.cite_in_72, new.cite_in_73, new.cite_in_74, new.cite_in_75, new.cite_in_76, new.cite_in_77, new.cite_in_78, new.cite_in_79, new.cite_in_80, new.cite_in_81, new.cite_in_82, new.cite_in_83, new.cite_in_84, new.cite_in_85, new.cite_in_86, new.cite_in_87, new.cite_in_88, new.cite_in_89, new.cite_in_90, new.cite_in_91, new.cite_in_92, new.cite_in_93, new.cite_in_94, new.cite_in_95, new.cite_in_96, new.cite_in_97, new.cite_in_98, new.cite_in_99, new.cite_in_100;
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