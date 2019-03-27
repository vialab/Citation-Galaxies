var express = require('express');
var cookieParser = require('cookie-parser')
const pg = require('pg');
var bodyParser = require('body-parser');
var path = require('path');
var crypto = require('crypto');
var master_cookie = "196d2081988549fb86f38cf1944e79a9";
var app = express();
var dbschema = require("./dbschema.js");
var named = require("yesql").pg;
const { exec } = require('child_process');
const pool = new pg.Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
// need cookieParser middleware before we can do anything with cookies
app.use(cookieParser());
app.use(express.static(`${__dirname}/public`));     // statics
// set a cookie
app.use(function (req, res, next) {
  // check if client sent cookie
  let cookie = req.cookies.cookieName;
  if(master_cookie != "") cookie = master_cookie;
  if (cookie === undefined) {
    // no: set a new cookie
    let nonce = Math.random().toString()
      , cookie_id = nonce.substring(2,nonce.length) + "_" + req.connection.remoteAddress;
    cookie_id = crypto.createHash('md5').update(cookie_id).digest('hex');
    res.cookie('cookieName', cookie_id, { expires: new Date(253402300000000) });
  }
  next(); // <-- important!
});



app.get('/', function(req,res,next) {
  res.sendFile(path.join(__dirname + "/index.html"));
})


app.get('/years', function(req, res, next) {
    pool.connect((err, client, done) => {
      pool.query('SELECT distinct(articleyear) FROM article order by articleyear', function(err, result) {
        done();
        if(err){
          console.log(err);
          return res.status(500);
        }
        return res.json(result.rows);
      });

    });
});


app.post('/queryCounts', function(req, res, next) {
    pool.connect((err, client, done) => {
      //Variables to be used in the query
      var searchQuery = JSON.parse(req.body.query);
      var year = req.body.year;
      var rangeLeft = req.body.rangeLeft;
      var rangeRight = req.body.rangeRight;
      var query = `
        select * from (
        	select wordSearch.lemma
        		, wordSearch.startlocationpaper as wordStart
        		, wordSearch.endlocationpaper as wordEnd
        		, citationSearch.sentencenum as citationSentence
        		, wordSearch.sentencenum as wordSentence
        		, citationSearch.startlocationpaper as citationStart
        		, citationSearch.endlocationpaper as citationEnd
        		, citationSearch.citationauthors as citationAuthors
        		, citationSearch.citationyear as citationYear
        		, citationSearch.citationarticletitle as citationArticleTitle
        		, wordSearch.articleid as articleID
            , ((( CAST(wordSearch.startlocationpaper as float)
                    +wordSearch.endlocationpaper)/2)
                /wordSearch.articleCharCount) as percent
        	from wordsearch, citationsearch
        	where wordsearch.articleid = citationsearch.articleid
        	and ((
        			(citationSearch.sentencenum - wordSearch.sentencenum) <= $1
        				and (citationSearch.sentencenum - wordSearch.sentencenum) >= 0)
        		or
        			((wordSearch.sentencenum - citationSearch.sentencenum) <= $2
        				and (wordSearch.sentencenum - citationSearch.sentencenum) >= 0))
        	and wordsearch.articleyear = $3 and (`;
      var values = [rangeLeft, rangeRight, year];
      var count = 4;
      for(var i = 0; i < searchQuery.length; i++){
        values.push(searchQuery[i]);
        query += "wordSearch.lemma = $" + count.toString();
        if(i < searchQuery.length - 1){
          query += " or ";
        }
        count ++;
      }
      query += ") limit 10000) as wordCitationJoin \
        order by wordCitationJoin.articleid";
      pool.query(query, values, function(err,result) {
        done();
        if(err) {
          console.log(err);
          return res.status(500);
        }
        let data = res.json(result.rows);
        return data;
      });
    });
  });


//Return the text of a paper
app.post('/paperText', function(req, res, next) {
    pool.connect((err, client, done) => {
      var paper = req.body.articleid;
      var tmp = "select papertext, articletitle, journaltitle, articleyear \
        from article where article.id = $1;";

      pool.query(tmp, [paper], function(err, result){
        done();
        if(err){
          console.log(err);
          return res.status(500);
        }
        return res.json(result.rows);
      });
    });
  });


//Return the location of a sentence for a certain article
app.post('/sectionBoundary', function(req, res, next) {
  pool.connect((err, client, done) => {
    var paper = req.body.articleid;
    var neededBoundaries = JSON.parse(req.body.neededBoundaries);
    var values = [paper];

    var query = `
      select sentence.sentencenum
        , sentence.startlocationpaper
        , sentence.endlocationpaper
      from sentence
      inner join paragraph on sentence.para_id = paragraph.id
      inner join article on paragraph.articleid_id = article.id and article.id=$1
      where (
    `;
    var count = 2;
    //Get location for all needed sentences
    for(var i = 0 ; i < neededBoundaries.length; i++){
      values.push(neededBoundaries[i][0]);
      values.push(neededBoundaries[i][1]);

      query += "(sentence.sentencenum = $" + count.toString() + " or sentence.sentencenum = $" + (count + 1).toString() + ")";
      if(i != neededBoundaries.length - 1){
        query += " or ";
      }
      count += 2;
    }

    query += ");";

    pool.query(query, values, function(err, result) {
      done();
      if(err){
        console.log(err);
        return res.status(500);
      }
      return res.json(result.rows)
    });
  });
});


//Same as queryCounts, but only for a specific paper
app.post('/queryCountsPaper', function(req, res, next) {
  pool.connect((err, client, done) => {
    var searchQuery = JSON.parse(req.body.query);
    var year = req.body.year;
    var paperid = req.body.paperid;
    var rangeLeft = req.body.rangeLeft;
    var rangeRight = req.body.rangeRight;

    var tmp = `
      select distinct *
      from (select wordSearch.lemma
      	, wordSearch.startlocationpaper as wordStart
      	, wordSearch.endlocationpaper as wordEnd
      	, citationSearch.sentencenum as citationSentence
      	, wordSearch.sentencenum as wordSentence
      	, citationSearch.startlocationpaper as citationStart
      	, citationSearch.endlocationpaper as citationEnd
      	, citationSearch.citationauthors as citationAuthors
      	, citationSearch.citationyear as citationYear
      	, citationSearch.citationarticletitle as citationArticleTitle
      	, wordSearch.articleid as articleID
      	, ((( CAST(wordSearch.startlocationpaper as float)
      			+wordSearch.endlocationpaper)/2)
      		/wordSearch.articleCharCount) as percent
      from wordSearch
      inner join citationSearch on wordSearch.articleid = citationSearch.articleid
      	and (((((citationSearch.sentencenum - wordSearch.sentencenum) <= `+rangeLeft
        +`) and (citationSearch.sentencenum - wordSearch.sentencenum) >= 0))
      		or ((((wordSearch.sentencenum - citationSearch.sentencenum) <= `+rangeRight
          +`) and (wordSearch.sentencenum - citationSearch.sentencenum) >= 0)))
      where wordSearch.articleyear = ` + year + " and (";

    for(var i = 0; i < searchQuery.length; i++){
        tmp += "wordSearch.lemma = '" + searchQuery[i] + "'";
        if(i < searchQuery.length - 1){
          tmp += " or ";
        }
    }
    tmp += " )limit 5000) as result where articleID = '" + paperid
      + "' order by articleid, citationSentence, wordStart;";
    pool.query(tmp, function(err, result) {
      done();
      if(err){
        console.log(err);
        return res.status(500);
      }
      return res.json(results.rows);
    })
  });
});

app.post("/api/*", function(req, res, next) {
  // all requests need a cookie
  let cookie_id = req.cookies.cookieName;
  if(master_cookie != "") cookie_id = master_cookie;

  let full_url = req.originalUrl.split("/");
  let table_name = full_url[full_url.length-1];

  if(!Object.keys(dbschema.query).includes(table_name)) {
    return res.json({});
  }

  let query = dbschema.query[table_name].query;
  let values = JSON.parse(req.body.values);
  if(dbschema.query[table_name].require_cookie) values["cookieid"] = cookie_id;
  pool.connect((err, client, done) => {
    pool.query(named(query)(values), function(err, result) {
      done();
      if(err) {
        console.log(err);
        return res.status(500);
      }
      return res.json({"data":result.rows, "name":table_name});
    });
  });
});

// add a rule to be applied to documents
app.post('/addsignal', function(req, res, next) {
  var text = req.body.text;
  var value = req.body.value;
  var category_id = req.body.category_id;
  let cookie_id = req.cookies.cookieName;
  if(master_cookie != "") cookie_id = master_cookie;
  pool.connect((err, client, done) => {
    pool.query("insert into signal(signal, score, signalcategoryid, cookieid, enabled) \
      values($1, $2, $3, $4, true) returning id;"
      , [text, value, category_id, cookie_id]
      , function(err, result) {
        done();
        if(err) {
          console.log(err);
          return res.status(500);
        }
        return res.json(result.rows);
      }
    );
  });
});


// pre-process sentiment counts for a specific query
app.post('/removesignal', function(req, res, next) {
  let signal_id = req.body.signal_id;
  let cookie_id = req.cookies.cookieName;
  if(master_cookie != "") cookie_id = master_cookie;
  pool.connect((err, client, done) => {
    pool.query("delete from signal where id=$1 and cookieid=$2;"
      , [signal_id, cookie_id]
      , function(err, result) {
        done();
        if(err) {
          console.log(err);
          return res.status(500);
        }
        return res.json({"status": "success", "signal_id": signal_id});
      }
    );
  });
});


// get word2vec results
app.get('/w2v/similar', function(req, res, next) {
  var word = req.query.word;
  exec(__dirname+"/model/similarity.sh " + word, function(error, stdout, stderr) {
    if(error) {
      console.log("exec error: " + error);
      return res.status(500);

    }
    let lines = stdout.split("\n");
    let payload = [];
    for(let i=1; i<lines.length; i++) {
      let row = lines[i].split(",");
      if(row.length < 1 && row[0] != "") {
        continue;
      }
      let temp = {};
      temp["word"] = row[0];
      temp["score"] = row[1];
      payload.push(temp);
    }
    return res.json(payload);
  });
});


// get search engine results
app.get('/search', function(req, res, next) {
  // var word = Buffer.from(req.body.data).toString("base64");
  var word = Buffer.from(req.query.data).toString("base64");
  exec(__dirname+"/model/search.sh " + word, function(error, stdout, stderr) {
    if(error) {
      console.log("exec error: " + error);
      return res.status(500);

    }
    let lines = JSON.parse(stdout);
    return res.json(lines);
  });
});


// dynamically update a row in our database -- measures have been taken to keep
// this function safe from injection (dbschema.js)
// req.body.data should be a JSON object with an "id" key
app.post("/update", function(req, res, next) {
  let data = JSON.parse(req.body.data);
  let table_name = JSON.parse(req.body.table_name);
  let index = JSON.parse(req.body.index);
  // make sure table and respective index column exists
  if(!dbschema.hasTable(table_name)) return res.status(400);
  if(!dbschema.hasColumn(table_name, index)) return res.status(400);
  pool.connect((err, client, done) => {
    let query = `UPDATE $1~ SET `;
    let values = [table_name];
    let columns = Object.keys(data);

    // Make sure all of the columns exist, and generate our query as we go
    for(let i=0; i<columns; i++) {
      let key = columns[i];
      if(key == "id") continue;
      if(!dbschema.hasColumn(table_name, key)) return res.status(400);
      if(values.length > 0) query += ", "
      query += key+" = $" + values.length;
      values.push(data[key]);
    }
    query += " WHERE " + index + " = $" + values.length;
    values.push(data["id"]); // index column must always exist in "id"

    client.query(query, values, function(err, result) {
      if(err) {
        console.log("update error: " + err);
        return res.status(500);
      }

    });
  });
});


// pre-process sentiment counts for a specific query
app.post('/process/signals', function(req, res, next) {
  pool.connect((err, client, done) => {
    let error_occurred = false;
    let searchQuery = JSON.parse(req.body.query)
    , year = req.body.year
    , rangeLeft = req.body.rangeLeft
    , rangeRight = req.body.rangeRight
    , ruleSet = JSON.parse(req.body.ruleSet)
    , cookie_id = req.cookies.cookieName
    , recache = Boolean(parseInt(req.body.recache))
    , ruleHash = year+"_"+searchQuery.join("_")+"_"
        +Buffer.from(req.body.ruleSet).toString("base64");
    if(master_cookie != "") cookie_id = master_cookie;
    // otherwise process new data
    query = `
      select articleID
        , citationStart
        , citationEnd
        , percent
        , articleyear
        , count(*) multiscore
      from (
      	select wordSearch.lemma
      		, wordSearch.startlocationpaper as wordStart
      		, wordSearch.endlocationpaper as wordEnd
      		, citationSearch.sentencenum as citationSentence
      		, wordSearch.sentencenum as wordSentence
      		, citationSearch.startlocationpaper as citationStart
      		, citationSearch.endlocationpaper as citationEnd
      		, citationSearch.citationauthors as citationAuthors
      		, citationSearch.citationyear as citationYear
      		, citationSearch.citationarticletitle as citationArticleTitle
      		, wordSearch.articleid as articleID
          , (citationSearch.sentencenum - wordSearch.sentencenum) rangeLeft
          , (wordSearch.sentencenum - citationSearch.sentencenum) rangeRight
          , wordSearch.articleyear
      		, ((( CAST(wordSearch.startlocationpaper as float)
                  +wordSearch.endlocationpaper)/2)
              /wordSearch.articleCharCount) as percent
      	from wordsearch, citationsearch
      	where wordsearch.articleid = citationsearch.articleid
      	and ((
      			(citationSearch.sentencenum - wordSearch.sentencenum) <= $1
      				and (citationSearch.sentencenum - wordSearch.sentencenum) >= 0)
      		or
      			((wordSearch.sentencenum - citationSearch.sentencenum) <= $2
      				and (wordSearch.sentencenum - citationSearch.sentencenum) >= 0))
      	and wordsearch.articleyear = $3 and (
    `;
    values = [rangeLeft, rangeRight, year];

    let count = 4;
    for(var i = 0; i < searchQuery.length; i++){
      values.push(searchQuery[i]);
      query += "wordSearch.lemma = $" + count.toString();
      if(i < searchQuery.length - 1){
        query += " or ";
      }
      count ++;
    }
    query += `) limit 10000) as wordCitationJoin
    group by articleID
      , articleyear
      , citationStart
      , citationEnd
      , percent
    order by wordCitationJoin.articleid`;

    getScores(client, query, values, ruleSet, ruleHash, recache).then(results => {
      done();
      return res.json(results);
    }).catch(err => {
      console.log(err);
      done();
      return res.status(500);
    });
  });
});

// async function that returns/calculates the sentiment for a specific query
async function getScores(client, query, values, ruleSet, ruleHash, recache) {
  // if we're not recaching the results, use old if applicable
  if(!recache) {
    // has this search been made before?
    let cache_query = `select querydata from querycache where queryid=$1`;
    // if it has already been cached, return the cached version
    let cached = await client.query(cache_query, [ruleHash]);
    if(cached.rowCount > 0) {
      let data = Buffer.from(cached.rows[0].querydata, "base64").toString();
      return JSON.parse(data);
    }
  }

  // otherwise, run the query
  let scores = [], citations = {};
  let query_result = await client.query(query, values);
  // aggregate all the citations by articleid
  query_result.rows.forEach(row => {
    if(row.articleid in citations) citations[row.articleid].push(row);
    else citations[row.articleid] = [row];
  });

  // now iterate each article
  for(let curr_id of Object.keys(citations)) {
    // get the text for this article
    let tmp = "select papertext, articletitle, journaltitle, articleyear from article where article.id = $1;"
      , row = citations[curr_id];
    let new_result = await client.query(tmp, [curr_id]);
    if(new_result.rowCount > 0) {
      // replace punctuation to bound all signals by whitespace always
      let paper_text = new_result.rows[0]
        .papertext.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g," ");
      paper_text = " "+paper_text+" "; // surround all words with whitespace
      // score the article by citation and rule
      row.forEach(cit => {
        let citation_text = paper_text.substring(cit.citationStart, cit.citationEnd)
          , new_row = cit;
        new_row["multiscore"] = parseInt(new_row["multiscore"]);
        new_row["score"] = {};
        Object.keys(ruleSet).forEach(cat_id => {
          new_row["score"][cat_id] = 0;
          for(let r of ruleSet[cat_id]) {
            // signals will be bounded by whitespace
            if(new RegExp( '\\s' + r.signal + '\\s', 'gi').test(citation_text)) {
              // found the signal.. now do the calculation
              new_row["score"][cat_id] += (cit.multiscore*r.value);
              scores.push(new_row);
            }
          }
        });
      });
    }
  }
  // cache this version for later
  cache_query = `insert into querycache(queryid, querydata) values($1, $2)
    ON CONFLICT (queryid) DO UPDATE
    SET querydata = $2;`;
  let query_data = Buffer.from(JSON.stringify(scores)).toString("base64");
  values = [ruleHash, query_data];
  await client.query(cache_query, values);

  return scores;
}


var server = app.listen(5432, function() {
    console.log("Node listening on http://localhost:5432/");
});
