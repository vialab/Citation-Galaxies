import pubmed_parser as pp
from nltk.tokenize import word_tokenize, sent_tokenize
import os
import re
import asyncio
import asyncpg
import json
import smtplib
import yagmail

def load_directory(directory: str):
    path_all = pp.list_xml_path(directory)
    return path_all


def parse(path: str):
    pubmed_meta = pp.parse_pubmed_xml(path)
    pubmed_text = pp.parse_pubmed_paragraph(path, all_paragraph=True)
    return pubmed_meta, pubmed_text


def getJournal(pub_dict: dict):
    return pub_dict["journal"]

def getAuthors(pub_dict: dict):
    authors = []
    for entry in pub_dict["author_list"]:
        tmp = ""
        if entry[0] != None:
            tmp += entry[0] + " "
        if entry[1] != None:
            tmp += entry[1]
        authors.append(tmp)
    return authors


def getTitle(pub_dict: dict):
    return pub_dict["full_title"]


def getPubMed_id(pub_dict: dict):
    return pub_dict["pmc"]


def getPublicationDate(pub_dict: dict):
    return pub_dict["publication_year"]


def getAffiliations(pub_dict: dict):
    affiliations = []
    for entry in pub_dict["affiliation_list"]:
        affiliations.append(entry[1])
    return affiliations


def getText(pub_dict: str):
    #pub_dict[""]
    return


def getAbstract(pub_dict: str):
    return pub_dict["abstract"]


#gets a word map where each key (word) has an array of ints. Each int represents the word position where the key (word) appeared in the document
def getWords(buffer: str):
    word_map = {}
    tokenBuffer = word_tokenize(buffer)
    for i in range(0, len(tokenBuffer)):
        if not tokenBuffer[i] in word_map:
            word_map[tokenBuffer[i]] = []
        word_map[tokenBuffer[i]].append(i)
    return word_map

#gets a sentence map where each key (word) has an array of ints. Each int corresponds to the sentence occurence where the key (word) appeared.
def getSentences(buffer: str):
    sent_map = {}
    sentTokenBuffer = sent_tokenize(buffer)
    for i in range(0, len(sentTokenBuffer)):
        tokenBuffer = word_tokenize(sentTokenBuffer[i])
        for token in tokenBuffer:
            if not token in sent_map:
                sent_map[token] = []
            sent_map[token].append(i)
    return sent_map

def checkMap(textMap):
    citationToken = "ЉЉ"
    if not citationToken in textMap:
        return None
    return textMap[citationToken]

def getCitationsAnalysis(buffer: list):
    expr = "\[(.*?)\]"
    citationToken = "ЉЉ"
    textBuffer = ""
    for section in buffer:
        ids = section["reference_ids"]
        text = section["text"]
        if citationToken in text:
            exit(-2)
        textBuffer += text + " "
    textBuffer = textBuffer[:-1]
    res = re.sub(expr, citationToken, textBuffer)
    wordMap, sentMap = getTextAnalysis(res)
    return wordMap, sentMap, checkMap(wordMap), checkMap(sentMap)

def getTextAnalysis(buffer: str):
    return getSentences(buffer), getWords(buffer)

async def createWordTable(conn):
    await conn.fetchrow('''SELECT full_text_words FROM pubmed_text ''')
    return

async def post_meta(pub_id, authors, title, year, journal, affiliation, conn):
    await conn.execute(
        '''INSERT INTO pubmed_meta(id, authors, title, year,journal, affiliation) VALUES($1,$2,$3,$4,$5, $6)''',
        int(pub_id), authors, title, int(year), journal, affiliation)
    return

async def post_text(pub_id, abs_word, abs_sent, text_word, text_sent,
                    text_cit_word, text_cit_sent, conn):
    await conn.execute(
        '''INSERT INTO pubmed_text(id, abstract_words, abstract_sentences, full_text_words, full_text_sentences, full_text_citations, citation_full_text_sentences) VALUES($1,$2,$3,$4,$5, $6,$7) on conflict do nothing''',
        int(pub_id), json.dumps(abs_word), json.dumps(abs_sent),
        json.dumps(text_word), json.dumps(text_sent), text_cit_word,
        text_cit_sent)
    return
    
async def create_word_map(conn):
    await conn.fetchrow('''SELECT loop_over_rows()''')
    return
async def main():
    conn = await asyncpg.connect(
        'postgresql://citationdb:citationdb@localhost:5435/citationdb')
    paths = load_directory('/scratch/zhills/pubmed_data/PubMed/')
    for path in paths:
        try:
            meta, text = parse(path)
            journal = getJournal(meta)
            authors = getAuthors(meta)
            title = getTitle(meta)
            pubmed_id = getPubMed_id(meta)
            date = getPublicationDate(meta)
            affiliations = getAffiliations(meta)
            #abstract = getAbstract(meta)
           # twordMap, tsentMap, tcitWord, tcitSent = getCitationsAnalysis(text)
            #await post_meta(pubmed_id, authors, title, date, journal, affiliations, conn)
            #wordMap, sentMap = getTextAnalysis(abstract)
            #await post_text(pubmed_id, wordMap, sentMap, twordMap, tsentMap,tcitWord, tcitSent, conn)
            await post_meta(pubmed_id, authors, title, date, journal, affiliations, conn)
        except Exception as e:
            yagmail.SMTP('codinfreakgf@gmail.com', 'shEA45thr5').send('codinfreakgf@gmail.com', 'error', 'path: ' + path+"\n" + "error: " + str(e))
            continue

        #print(sentMap)

asyncio.get_event_loop().run_until_complete(main())

#testEmail()