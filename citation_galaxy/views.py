# views.py
import asyncio
import re
import time
from json import dumps, loads

import string

punctuation = string.punctuation + "''``\""
removePunc = str.maketrans("", "", string.punctuation)

# import aiohttp_jinja2
from aiohttp import web
from aiohttp_session import get_session, setup
from cryptography import fernet

import citation_galaxy.database as dblib
from citation_galaxy.database import NUMBER_COLS, QueryManager, api, schema
from citation_galaxy.settings import config as conf
from citation_galaxy.utils import list_in_string
from nltk.tokenize import sent_tokenize

from citation_galaxy.wordRecommender import WordRecommender
from citation_galaxy.process_signals import build_signal_search

wordRecommender = WordRecommender()

routes = web.RouteTableDef()


def parseRangeString(str):
    return tuple(map(int, re.findall(r"\d+", str)))


def get_db(request):
    return request.app["db"]


async def get_db_sess(request):
    return request.app["db"], await get_session(request)


@routes.post("/api/get-recommended-word")
async def getWords(request):
    top = 5
    res = []
    post_data = await request.json()
    for i in range(1, len(post_data)):
        words = wordRecommender.getRecommendation([post_data[0], post_data[i]],
                                                  5)
        for j in range(0, len(words)):
            res.append(words[j])
    #remove duplicates
    for word in res:
        if word[0] in post_data:
            res.remove(word)
    res.sort(reverse=True, key=lambda x: x[1])
    #if greater than required suggestion amount delete the least similar
    if len(res) > top:
        print(len(res))
        res = res[:-(len(res) - top)]
        print(len(res))

    return web.json_response({"suggestions": res})


@routes.post("/api/insert")
async def insert_handler(request):
    #print(request)
    db, sess = await get_db_sess(request)

    post_data = await request.json()
    # query_params = session.get('query_params',{}).copy()
    # query_params.update( post_data.get('values') )
    # query_params = post_data.get('values')
    table_name = post_data.get("table_name", "")
    if table_name == "signalbycategory":
        table_name = "signal"
        if post_data["values"] != None:
            post_data["values"]["signal"] = dumps(
                loads(post_data["values"]["signal"]))
        print(table_name)
    # get api schema
    api_schema = api.get("insert_" + table_name, None)
    print(api_schema["query"])
    if api_schema:
        # await request.read()
        # post_data = {}
        # if request.has_body:
        # post_data = await request.json()
        # query_params = sess.get('query_params',{}).copy()
        # query_params.update( post_data.get('values') )
        query_params = post_data.get("values", {}).copy()
        if api_schema.get("require_cookie", False):
            query_params["cookieid"] = sess["id"]

        queries = aiosql.from_str(api_schema["query"], "asyncpg")
        query = getattr(
            queries, queries.available_queries[0]
        )  # Gets the first created query from the list of queries. This is because i feed individual queries in on it's own and generate them that way

        await query(db, **query_params)

    return web.json_response({})
    # return web.json_response( {
    #     'data': data,
    #     'aliases': {},
    #     'links': {},
    #     'name': 'signalcategory',
    #     'schema': {},
    #     'parent': {}
    # })


@routes.post("/api/delete")
async def delete_handler(request):
    db, session = await get_db_sess(request)

    post_data = await request.json()
    query_params = session.get("query_params", {}).copy()
    # query_params.update( post_data.get('values') )
    # query_params = post_data.get('values')
    table_name = post_data.get("table_name", "")
    if table_name == "signalbycategory":
        table_name = "signal"
    # get api schema
    api_schema = api.get("delete_" + table_name, None)

    if api_schema:
        rec_id = post_data.get("id", -1)
        # await request.read()
        # post_data = {}
        # if request.has_body:
        # post_data = await request.json()
        # query_params = sess.get('query_params',{}).copy()
        # query_params.update( post_data.get('values') )
        query_params = post_data.get("values", {}).copy()
        query_params["id"] = rec_id
        if api_schema.get("require_cookie", False):
            query_params["cookieid"] = session["id"]

        queries = aiosql.from_str(api_schema["query"], "asyncpg")
        query = getattr(
            queries, queries.available_queries[0]
        )  # Gets the first created query from the list of queries. This is because i feed individual queries in on it's own and generate them that way

        await query(db, **query_params)

    return web.json_response({})


@routes.post("/api/update")
async def update_handler(request):
    db, session = await get_db_sess(request)

    post_data = await request.json()
    query_params = session.get("query_params", {}).copy()
    query_params.update(post_data.get("values"))
    # query_params = post_data.get('values')

    table_name = post_data.get("table_name", "")
    if table_name == "signalbycategory":
        table_name = "signal"

    api_schema = api.get("update_" + table_name, None)

    if api_schema:
        query_params = post_data.get("values", {}).copy()
        # query_params['signal'] = dumps(query_params['signal'])
        rec_id = query_params.get("id", -1)

        query_params["id"] = int(rec_id)
        # query_params['signalcategoryid'] = int(query_params.get('signalcategoryid',-1))
        if api_schema.get("require_cookie", False):
            query_params["cookieid"] = session["id"]

        queries = aiosql.from_str(api_schema["query"], "asyncpg")
        query = getattr(
            queries, queries.available_queries[0]
        )  # Gets the first created query from the list of queries. This is because i feed individual queries in on it's own and generate them that way

        await query(db, **query_params)
    data = []
    return web.json_response({})


import aiosql


@routes.post("/api/{table_name}")
async def api_handler(request):
    db, sess = await get_db_sess(request)

    table_name = request.match_info["table_name"]
    print("table_name:" + table_name)

    # get api schema
    api_schema = api.get(table_name, None)
    print(api_schema)
    if api_schema:
        # await request.read()
        post_data = {}
        # if request.has_body:
        post_data = await request.json()
        # query_params = sess.get('query_params',{}).copy()
        # query_params.update( post_data.get('values') )
        query_params = post_data.get("values", {}).copy()
        print(query_params)
        if api_schema.get("require_cookie", False):
            query_params["cookieid"] = sess["id"]

        queries = aiosql.from_str(api_schema["query"], "asyncpg")
        query = getattr(
            queries, queries.available_queries[0]
        )  # Gets the first created query from the list of queries. This is because i feed individual queries in on it's own and generate them that way

        results = await query(db, **query_params)
        rows = [dict(record) for record in results]

        parent_col = api_schema.get("parent", None)
        parent_id = query_params.get(parent_col, None)
        parent = {}
        if parent_col and parent_id:
            parent = {"id": parent_id, "col": parent_col}

        return web.json_response({
            "data": rows,
            "aliases": api_schema.get("aliases", {}),
            "links": api_schema.get("links", {}),
            "actions": api_schema.get("actions", {}),
            "name": table_name,
            "schema": schema[api[table_name]["origin"]],
            "parent": parent,
        })
    else:
        return web.json_response({})


@routes.post("/gateway/process/signals")
async def process_signal(request):
    db, session = await get_db_sess(request)
    query_params = await request.json()
    data = {"front_data": {}, "signal_scores": {}}
    return web.json_response(data)


def parseText(text, ranges, searchedTerm, ruleSet):
    #aggregate text
    aggText = ""
    citationToken = 'ЉЉ'
    citationToken = citationToken.lower()
    referenceList = []
    sentenceHits = []
    binHits = []
    ruleSetHits = []
    text = loads(text)
    puncTokens = ':|\!|\.|\,|\/|\:|\;|\"'
    for block in text:
        aggText += block["text"]
        referenceList = referenceList + block["reference_ids"]
    citationMap = []
    #find word position
    sentences = sent_tokenize(aggText.lower())
    for j in range(0, len(sentences)):
        res = [
            i for i in range(0, len(sentences[j]))
            if sentences[j].startswith(citationToken, i)
        ]
        citationMap.append(referenceList[:len(res)])
        del referenceList[:len(res)]

    #analyze range
    for j in range(0, len(sentences)):
        if searchedTerm in re.sub(puncTokens, '', sentences[j]):
            #check left
            found = False
            left = ranges[searchedTerm][0] + 2
            for k in range(0, left):
                #check if we are going past the index
                idx = j - k
                if idx < 0:
                    break
                if citationToken in sentences[idx]:
                    #create sentence hit
                    #check if full range exceeds array bounds
                    leftBounds = j - (ranges[searchedTerm][0] + 1)
                    rightBounds = j + (ranges[searchedTerm][1] + 2)
                    if leftBounds < 0:
                        leftBounds = 0
                    if rightBounds > len(sentences):
                        rightBounds -= rightBounds - (len(sentences) + 1)
                    sentenceHits.append(
                        replaceCitationTokens(
                            citationMap, sentences[leftBounds:rightBounds],
                            leftBounds))
                    binHits.append(int(j / len(sentences) * 100))
                    found = True
                    categoriesFound = []
                    for i in ruleSet:
                        for rules in ruleSet[i]["signals"]:
                            categoryHit = True
                            maxRange = 0
                            maxLeft = 0
                            maxRight = 0
                            for rule in loads(rules["signal"]):
                                ruleLeft = j - (int(rule["range"][0]) + 1)
                                ruleRight = j + (int(rule["range"][1]) + 2)
                                if ruleLeft < 0:
                                    ruleLeft = 0
                                if ruleRight > len(sentences):
                                    ruleRight -= ruleRight - (len(sentences) +
                                                              1)
                                if maxRange < ruleRight - ruleLeft:
                                    maxRange = ruleRight - ruleLeft
                                    maxLeft = ruleLeft
                                    maxRight = ruleRight
                                if ("modifier" in rule) == False:
                                    rule["modifier"] = "AND"
                                if checkRule(sentences[ruleLeft:ruleRight],
                                             rule["query"],
                                             rule["modifier"]) == False:
                                    categoryHit = False
                                    break
                            if categoryHit:
                                categoriesFound.append({
                                    "name":
                                    ruleSet[i]["name"],
                                    "color":
                                    ruleSet[i]["color"],
                                    "signals":
                                    dumps(dict(ruleSet[i]["signals"]))
                                })
                                end = len(sentenceHits) - 1
                                if len(sentenceHits[end]) < maxRange:
                                    sentenceHits[end] = replaceCitationTokens(
                                        citationMap,
                                        sentences[maxLeft:maxRight], maxLeft)
                                break
                    ruleSetHits.append(categoriesFound)
                    break
            if found:
                continue
            #check right if left was not found
            right = ranges[searchedTerm][0] + 2
            for k in range(0, right):
                if searchedTerm in re.sub(puncTokens, '', sentences[j]):
                    idx = j + k
                    #check if idx is outside the bounds of the sentence array
                    if idx >= len(sentences):
                        break
                    if citationToken in sentences[idx]:
                        #create sentence hit
                        #check if full range exceeds array bounds
                        leftBounds = j - (ranges[searchedTerm][0] + 1)
                        rightBounds = j + (ranges[searchedTerm][1] + 2)
                        if leftBounds < 0:
                            leftBounds = 0
                        if rightBounds > len(sentences):
                            rightBounds -= rightBounds - (len(sentences) + 1)
                        sentenceHits.append(
                            replaceCitationTokens(
                                citationMap, sentences[leftBounds:rightBounds],
                                leftBounds))
                        binHits.append(int(j / len(sentences) * 100))
                        categoriesFound = []
                        for i in ruleSet:
                            for rules in ruleSet[i]["signals"]:
                                maxRange = 0
                                maxLeft = 0
                                maxRight = 0
                                categoryHit = True
                                for rule in loads(rules["signal"]):
                                    ruleLeft = j - (int(rule["range"][0]) + 1)
                                    ruleRight = j + (int(rule["range"][1]) + 2)
                                    if ruleLeft < 0:
                                        ruleLeft = 0
                                    if ruleRight > len(sentences):
                                        ruleRight -= ruleRight - (
                                            len(sentences) + 1)
                                    if maxRange < ruleRight - ruleLeft:
                                        maxRange = ruleRight - ruleLeft
                                        maxLeft = ruleLeft
                                        maxRight = ruleRight
                                    if ("modifier" in rule) == False:
                                        rule["modifier"] = "AND"
                                    if checkRule(sentences[ruleLeft:ruleRight],
                                                 rule["query"],
                                                 rule["modifier"]) == False:
                                        categoryHit = False
                                        break
                                if categoryHit:
                                    categoriesFound.append({
                                        "name":
                                        ruleSet[i]["name"],
                                        "color":
                                        ruleSet[i]["color"],
                                        "signals":
                                        dumps(dict(ruleSet[i]["signals"]))
                                    })
                                    end = len(sentenceHits) - 1
                                    if len(sentenceHits[end]) < maxRange:
                                        sentenceHits[
                                            end] = replaceCitationTokens(
                                                citationMap,
                                                sentences[maxLeft:maxRight],
                                                maxLeft)
                                    break
                        ruleSetHits.append(categoriesFound)
                        break
    #return sentenceHits and their respective binHits in the paper
    return sentenceHits, binHits, ruleSetHits


def replaceCitationTokens(referenceMap, sentences, minIdx):
    citationToken = 'ЉЉ'
    citationToken = citationToken.lower()
    for j in range(0, len(sentences)):
        for i in range(0, len(referenceMap[minIdx + j])):
            sentences[j] = sentences[j].replace(citationToken,
                                                referenceMap[minIdx + j][i], 1)
    return sentences


def checkRule(sentences, rule, modifier):
    puncTokens = ':|\!|\.|\,|\/|\:|\;|\"'
    if modifier == "AND":
        for sentence in sentences:
            if rule in re.sub(puncTokens, '', sentence):
                return True
        return False
    else:
        for sentence in sentences:
            if rule in re.sub(puncTokens, '', sentence):
                return False
        return True


@routes.post("/gateway/papers")
async def papers(request):
    db, session = await get_db_sess(request)

    # print("query:",request,db.question.select())
    query_params = await request.json()
    increment = int(query_params.get("increment", 10))
    query_params["cookie_id"] = session["id"]
    last_rank = int(query_params.get("lastRank", 0))
    n_rank = query_params.get("nrank", 0)
    #categories = await db.fetch("select id, catname from signalcategory where cookieid=$1", query_params["cookie_id"])
    #ruleQuery = "select article_text.title, article_text.id, article_text.pub_year, article_text.sections from article_search inner join article_text on article_search .id = article_text.id"
    #limit = f"limit {n_rank} offset {last_rank}"
    #jobs = []
    #for category in categories:
    #    signals = await db.fetch(
    #        "select id, signal from signal where signalcategoryid=$1 and cookieid=$2", int(category["id"]), query_params["cookie_id"]
    #    )
    #    for signal in signals:
    #        subquery, args = build_signal_search(signal)
    #        mainQuery = ruleQuery + subquery.replace("article_search","") + limit
    #        jobs.append(db.fetch(mainQuery, *args))
    #results = await asyncio.gather(*jobs)

    # range_list = query_params.get('selections', None)
    range_list = list(
        map(parseRangeString, query_params.get("selections", None)))
    signals = query_params.get("signals", {})
    journal_id = query_params.get("journalid", "")

    sess_params = session.get("query_params", {})
    search_input = sess_params.get("query", "")
    words_left = sess_params.get("rangeLeft", 0)
    words_right = query_params.get("rangeRight", 0)

    search_text = ""
    subsearch_text = ""
    search_params = []
    if len(search_input) > 0:
        # search_text = ' where ts_search @@ to_tsquery(\'{0}\')'.format( ' & '.join( ( word for word in search_input ) ) )
        search_text += " where text_search @@ setweight( websearch_to_tsquery('english', $1), 'BD') "  # .format( ' & '.join( ( word for word in search_input ) ) )
        search_params.append(
            search_input
        )  # TODO: use the ts_rank functions in postgres to rank?
        if words_left >= 0 or words_right >= 0:
            subsearch_text = "where text_search @@ setweight( to_tsquery('english', $2), 'BC') "
            subsearch_params = []
            stripped_input = search_input.translate(removePunc)
            stripped_input = stripped_input.replace(" or ", " ")
            stripped_input = stripped_input.replace(" and ", " ")
            for word in stripped_input.split(" "):
                for dist in range(0, words_left + 1):
                    subsearch_params.append(f"{word} <{dist}> љљ")
                for dist in range(0, words_right + 1):
                    subsearch_params.append(f"љљ <{dist}> {word}")
            search_params.append(" | ".join(subsearch_params))
    querymanager = QueryManager(db, increment, search_text, subsearch_text,
                                search_params)
    tasks = [
        querymanager.do_papers_query(year_range_tup, n_rank, last_rank)
        for year_range_tup in range_list
    ]
    results = await asyncio.gather(*tasks)
    sorted_articles = {}
    categories = await db.fetch(
        "select id, catname, color from signalcategory where cookieid=$1",
        session["id"])
    res = {}
    for category in categories:
        signals = await db.fetch(
            "select id, signal from signal where signalcategoryid=$1 and cookieid=$2",
            int(category["id"]), session["id"])
        res[category["id"]] = {
            "name": category["catname"],
            "color": category["color"],
            "signals": signals
        }
    sorted_text = {}
    years = set()
    journals = {}
    ruleHits = {}
    ranges = {}
    ranges[query_params["query"]] = [
        query_params["rangeLeft"], query_params["rangeRight"]
    ]
    for yearResults in results:
        for (count, row) in enumerate(yearResults):
            rec = {
                "content": {},
                "max": 0,
                "year": row["pub_year"],
                "rank": (count + 1) + last_rank,
                "total": 0,
            }
            sentenceHits, binHits, ruleInfo = parseText(
                row["sections"], ranges, query_params["query"], res)
            if len(sentenceHits) == 0:
                print("Error: 0 sentenceHits for paper id " + str(row["id"]))
            for i in range(0, 10):
                rec["content"][i] = 0
            for hit in binHits:
                rec["content"][int(hit / 10)] += 1
            #do the paper chunks
            #for (chunk, count) in dblib.reshape_count_columns(increment):
            #    rec["content"][count] = row[f"ref_count_{count}"]
            journal_id = int(row.get("journalid", 0))
            # journals.setdefault(journal_id, {"title": row["journaltitle"], "years": set()})
            # journals[journal_id]['years'].add(row['pub_year'])
            years.add(row["pub_year"])
            rec["max"] = max(rec["content"].values())
            sorted_articles[row["id"]] = rec
            sorted_text[row["id"]] = sentenceHits
            ruleHits[row["id"]] = ruleInfo
    maxCount = 6
    return web.json_response({
        "max": maxCount,
        "papers": sorted_articles,
        "sentenceHits": sorted_text,
        "ruleHits": ruleHits,
        "years": list(years),
        "journals": journals
    })


@routes.get("/gateway/paper")
async def paper(request):
    # db = request.app["db"]
    db, session = await get_db_sess(request)
    paper_id = int(request.rel_url.query["id"])

    # session = await get_session(request)
    query_params = session.get("query_params", {})
    query_text = query_params.get("query", "")

    querymanager = QueryManager(db)
    results = (await querymanager.do_paper_query(paper_id))[0]
    sections = loads(results["sections"])

    data = {
        "id": results["id"],
        "papertext": "",
        "charcount": 0,
        "articletitle": results.get("title", ""),
        "articleyear": results["pub_year"],
        "journaltitle": "",
        # 'paragraphs': results['sections'],
    }

    keep_sections = []
    for section in sections:
        # if len(query_list)==0 or list_in_string(query_list, section['text'].lower()) or list_in_string(query_list, section['section'].lower()):
        for ref in section["reference_ids"]:
            section["text"] = section["text"].replace("ЉЉ", ref, 1)

            section.setdefault("citations", []).append({
                "citationtext": ref,
            })

        keep_sections.append(section)

    data["paragraphs"] = keep_sections

    return web.json_response(data)


# Query route
async def query(request):
    # db = request.app["db"]
    db, session = await get_db_sess(request)

    # print("query:",request,db.question.select())
    query_params = await request.json()
    num_bins = query_params.get("increment", 10)
    search_input = query_params.get("query", "").lower()
    words_left = query_params.get("rangeLeft", -1)
    words_right = query_params.get("rangeRight", -1)

    # Session
    # session = await get_session(request)
    session["query_params"] = query_params
    session["query_params"]["query"] = search_input
    # last_visit = session['last_visit'] if 'last_visit' in session else None
    # session['last_visit'] = time.time()
    # text = 'Last visited: {}'.format(last_visit)

    # query_text = build_summing_query( num_bins )
    query_text = ""

    query_search = ""

    search_text = ""
    subsearch_text = ""
    search_params = []

    if len(search_input) > 0:
        # search_text = 'article_search where ts_search @@ to_tsquery(\'{0}\')'.format( ' & '.join( ( word for word in search_input ) ) )
        search_text = "article_search where text_search @@ setweight(websearch_to_tsquery('english', $1), 'BD') "  # .format( ' & '.join( ( word for word in search_input ) ) )
        # search_params.append(" & ".join((word for word in search_input)))
        search_params.append(search_input)

        if words_left >= 0 or words_right >= 0:
            subsearch_text = "where text_search @@ setweight(to_tsquery('english', $2), 'BC') "

            subsearch_params = []
            stripped_input = search_input.translate(removePunc)
            stripped_input = stripped_input.replace(" or ", " ")
            stripped_input = stripped_input.replace(" and ", " ")
            for word in stripped_input.split(" "):
                for dist in range(0, words_left + 1):

                    subsearch_params.append(f"{word} <{dist}> ЉЉ")

                for dist in range(0, words_right + 1):
                    subsearch_params.append(f"ЉЉ <{dist}> {word}")

            search_params.append(" | ".join(subsearch_params))

        # search_values = ' & '.join( ( word for word in search_input.split(' ') ) )

    else:
        search_text = "article_search"

    subsearch_text += "group by pub_year order by pub_year"

    querymanager = QueryManager(db, num_bins, search_text, subsearch_text,
                                search_params)

    results = await asyncio.gather(querymanager.do_summing_query(),
                                   querymanager.do_counting_query())

    agg = {}
    for row in results[0]:
        year = row.get("pub_year")
        counts = list(row.values())[1:]
        counts = [0 if v is None else v for v in counts]

        agg.setdefault(str(year), {"content": counts, "max": max(counts)})

    for row in results[1]:
        year = row.get("pub_year")
        counts = list(row.values())[1:]
        counts = [0 if v is None else v for v in counts]

        data = agg.get(str(year), {})
        data.setdefault("papers", {"content": counts, "max": max(counts)})

    return web.json_response({"agg": agg})


async def years(request):
    """ Returns a list of dictionaries where the dicts have an entry named "articleyear" and an integer associated with it
    """
    sess = await get_session(request)
    if not sess.get("id", False):
        key = fernet.Fernet.generate_key()
        sess.setdefault("id", key.decode("utf-8"))

    return web.json_response(
        [{
            "articleyear": year
        } for year in range(conf["year_range"]["max"] -
                            15, conf["year_range"]["max"] + 1)]
        # [{"articleyear": year} for year in range(conf["year_range"]["min"], conf["year_range"]["max"] + 1)]
    )


@routes.post("/api/get-rules")
async def getRules(request):
    db, session = await get_db_sess(request)
    categories = await db.fetch(
        "select id, catname, color from signalcategory where cookieid=$1",
        session["id"])
    res = {}
    for category in categories:
        signals = await db.fetch(
            "select id, signal from signal where signalcategoryid=$1 and cookieid=$2",
            int(category["id"]), session["id"])
        res[category["id"]] = {
            "name": category["catname"],
            "color": category["color"],
            "signals": signals
        }
    return web.json_response(dumps(res))


# @aiohttp_jinja2.template('index.html')
@routes.get("/")
async def index(request):
    return web.FileResponse("./citation_galaxy/public/index.html")


# @aiohttp_jinja2.template('detail.html')
# async def poll(request):
#     async with request.app['db'].acquire() as conn:
#         question_id = request.match_info['question_id']
#         try:
#             question, choices = await db.get_question(conn,
#                                                       question_id)
#         except db.RecordNotFound as e:
#             raise web.HTTPNotFound(text=str(e))
#         return {
#             'question': question,
#             'choices': choices
#         }

# @aiohttp_jinja2.template('results.html')
# async def results(request):
#     async with request.app['db'].acquire() as conn:
#         question_id = request.match_info['question_id']

#         try:
#             question, choices = await db.get_question(conn,
#                                                       question_id)
#         except db.RecordNotFound as e:
#             raise web.HTTPNotFound(text=str(e))

#         return {
#             'question': question,
#             'choices': choices
#         }

# async def vote(request):
#     async with request.app['db'].acquire() as conn:
#         question_id = int(request.match_info['question_id'])
#         data = await request.post()
#         try:
#             choice_id = int(data['choice'])
#         except (KeyError, TypeError, ValueError) as e:
#             raise web.HTTPBadRequest(
#                 text='You have not specified choice value') from e
#         try:
#             await db.vote(conn, question_id, choice_id)
#         except db.RecordNotFound as e:
#             raise web.HTTPNotFound(text=str(e))
#         router = request.app.router
#         url = router['results'].url_for(question_id=str(question_id))
#         return web.HTTPFound(location=url)
