import asyncio
import asyncpg
from pathlib import Path
import json
import os
import sys
from text_analytics import parse_markup

def dataValid(dic: dict):
    valid=True
    empty = '[]'
    aff = json.loads(dic["affiliation"])
    validAff=False
    for a in aff:
        validAff = validAff or a["affiliation"] != ""
    if not validAff:
        return validAff
    for key in dic.keys():
        if dic[key] == empty:
            valid=False
            break
    return valid

def getValues(dic: dict):
    tAuthors = json.loads(dic["authors"])
    authors=[]
    for author in tAuthors:
        if not "lastName" in author:
            if author["firstName"] == None:
                author["firstName"] =""
            authors.append(author["firstName"])
        elif not "firstName" in author:
            if author["lastName"] == None:
                author["lastName"] == ""
            authors.append(author["lastName"])
        else:
            if author["lastName"] == None:
                author["lastName"] = ""
            if author["firstName"] == None:
                author["firstName"] =""
            authors.append(author["firstName"] + " " + author["lastName"])
    journal_data = json.loads(dic["journal"])
    journal_string=''
    for title in journal_data:
        journal_string += title["title"]+" "
    journal_string = journal_string[:-1]
    year = int(json.loads(dic["date"])[0]["date"])
    paper_id = json.loads(dic["id"])[0]["id"] 
    affiliation = json.loads(dic["affiliation"])
    temp = []
    for a in affiliation:
        temp.append(a["affiliation"])
    affiliation = temp
    return paper_id, authors, year, journal_string, affiliation

def get_analytics(data):
    return parse_markup(data)

async def post_file(json_data, conn):
    paper_id, authors, year, journal_string, affiliation = getValues(json_data)
    await conn.execute('''INSERT INTO erudit_meta(id, authors, year, journal, affiliation) VALUES($1,$2,$3,$4,$5) on conflict (id) do nothing''', paper_id, authors, year, journal_string, affiliation)

async def post_text(json_data, paper_id, conn):
    if not len(json_data):
        return
    idx=-1
    for i in range(0, len(json_data)):
        if json_data[i]["sent"] != "":
            idx=i
    if idx ==-1:
        return
    await conn.execute('''INSERT INTO erudit_text(id, lang, sent_map, word_map) VALUES($1,$2,$3,$4) on conflict (id) do nothing''', paper_id, json_data[idx]["lang"], json.dumps(json_data[idx]["sent"]), json.dumps(json_data[idx]["word"]))
    return

async def walker(directory:str, conn):
    print(sys.path[0])
    for file in Path(directory).glob('**/*.json'):
        currentFile = str(file)
        with open(currentFile) as json_file:
            data = json.load(json_file)
            if dataValid(data):
                #await post_file(data, conn)
                paper_id, authors, year, journal_string, affiliation = getValues(data)
                await post_text(get_analytics(data), paper_id, conn)
    return

async def main():
    conn = await asyncpg.connect('postgresql://citationdb:citationdb@localhost:5435/citationdb')
    await walker('/home/zhills/erudit_data/new_data', conn)
    await conn.close()
    return

asyncio.get_event_loop().run_until_complete(main())

def getAffiliationList(directory:str):
    for file in Path(directory).glob("**/*.json"):
        currentFile = str(file)
        with open(currentFile) as json_file:
            data = json.load(json_file)
            if dataValid(data):
                affiliation = json.loads(data["affiliation"])
                temp = []
                for a in affiliation:
                    if a["affiliation"] != None:
                        temp.append(a["affiliation"])
                affiliation = temp
                with open("affiliation.txt", "a") as af_file:
                    for a in affiliation:
                        af_file.write(a+"\n")

#getAffiliationList('/home/zhills/erudit_data/new_data')
