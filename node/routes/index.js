//Define needed variables
const express = require('express');
const router = express.Router();
var cors = require('cors');
router.use(cors({origin: '*'}));
const { Pool } = require('pg');

//Create a pool for the inbound queries
const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT
});
module.exports = router;

//Return the years from the database
router.get('/years', function(req, res, next) {
  pool.connect((err, client, done) => {
    client.query('SELECT distinct(articleyear) FROM article order by articleyear', function(err, result) {
      done();
      if(err){
        console.log(err);
        return res.status(500);
      }
      return res.json(result.rows);
    });

  });
});

//Return the hits for a specific query in a specific year
router.post('/queryCountsTEST', function(req, res, next) {
  pool.connect((err, client, done) => {
    //Variables to be used in the query
    var searchQuery = JSON.parse(req.body.query);
    var year = req.body.year;
    var rangeLeft = req.body.rangeLeft;
    var rangeRight = req.body.rangeRight;


    
    var query = "select * from (select wordSearch.lemma, wordSearch.startlocationpaper as wordStart, wordSearch.endlocationpaper as wordEnd, citationSearch.sentencenum as citationSentence, wordSearch.sentencenum as wordSentence, citationSearch.startlocationpaper as citationStart, citationSearch.endlocationpaper as citationEnd, citationSearch.citationauthors as citationAuthors, citationSearch.citationyear as citationYear, citationSearch.citationarticletitle as citationArticleTitle , wordSearch.articleid as articleID,  ((( CAST(wordSearch.startlocationpaper as float)+wordSearch.endlocationpaper)/2)/wordSearch.articleCharCount) as percent from wordsearch, citationsearch where wordsearch.articleid = citationsearch.articleid and (((((citationSearch.sentencenum - wordSearch.sentencenum) <= $1) and (citationSearch.sentencenum - wordSearch.sentencenum) >= 0)) or ((((wordSearch.sentencenum - citationSearch.sentencenum) <= $2) and (wordSearch.sentencenum - citationSearch.sentencenum) >= 0))) and wordsearch.articleyear = $3 and (";
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
    query += ") limit 10000) as wordCitationJoin order by wordCitationJoin.articleid";

    client.query(query, values, function(err,result) {
      done();
      if(err) {
        console.log(err);
        return res.status(500);
      }
      return res.json(result.rows);
    });
  });
});

//Return the text of a paper
router.post('/paperText', function(req, res, next) {
  pool.connect((err, client, done) => {
    var paper = req.body.articleid;
    var tmp = "select papertext, articletitle, journaltitle, articleyear from article where article.id = $1;";

    client.query(tmp, [paper], function(err, result){
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
router.post('/sectionBoundary', function(req, res, next) {
  pool.connect((err, client, done) => {
    var paper = req.body.articleid;
    var neededBoundaries = JSON.parse(req.body.neededBoundaries);
    var values = [paper];

    var query = "select sentence.sentencenum, sentence.startlocationpaper, sentence.endlocationpaper from sentence inner join paragraph on sentence.para_id = paragraph.id inner join article on paragraph.articleid_id = article.id and article.id = $1 where (";
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
    
    client.query(query, values, function(err, result) {
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
router.post('/queryCountsPaper', function(req, res, next) {
  pool.connect((err, client, done) => {
    var searchQuery = JSON.parse(req.body.query);
    var year = req.body.year;
    var paperid = req.body.paperid;
    var rangeLeft = req.body.rangeLeft;
    var rangeRight = req.body.rangeRight;

    var tmp = "select distinct * from (select wordSearch.lemma, wordSearch.startlocationpaper as wordStart, wordSearch.endlocationpaper as wordEnd, citationSearch.sentencenum as citationSentence, wordSearch.sentencenum as wordSentence, citationSearch.startlocationpaper as citationStart, citationSearch.endlocationpaper as citationEnd, citationSearch.citationauthors as citationAuthors, citationSearch.citationyear as citationYear, citationSearch.citationarticletitle as citationArticleTitle , wordSearch.articleid as articleID,  ((( CAST(wordSearch.startlocationpaper as float)+wordSearch.endlocationpaper)/2)/wordSearch.articleCharCount) as percent from wordSearch inner join citationSearch on wordSearch.articleid = citationSearch.articleid and (((((citationSearch.sentencenum - wordSearch.sentencenum) <= "+rangeLeft+") and (citationSearch.sentencenum - wordSearch.sentencenum) >= 0)) or ((((wordSearch.sentencenum - citationSearch.sentencenum) <= "+rangeRight+") and (wordSearch.sentencenum - citationSearch.sentencenum) >= 0))) where wordSearch.articleyear = "+year+" and (";
    for(var i = 0; i < searchQuery.length; i++){
        tmp += "wordSearch.lemma = '" + searchQuery[i] + "'";
        if(i < searchQuery.length - 1){
          tmp += " or ";
        }
    }
    tmp += " )limit 5000) as result where articleID = '" + paperid + "' order by articleid, citationSentence, wordStart;";

    client.query(tmp, function(err, result) {
      done();
      if(err){
        console.log(err);
        return res.status(500);
      }
      return res.json(results.rows);
    })
  });
});