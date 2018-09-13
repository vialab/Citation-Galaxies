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
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    // SQL Query > Select Data
    const query = client.query('SELECT distinct(articleyear) FROM article order by articleyear');
    // Array to store results
    var results = [];
    // Stream results back one row at a time
    query.on('row', (row) => {
      results.push(row);
    });
    // After all data is returned, close connection and return results
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//Return the hits for a specific query in a specific year
router.post('/queryCounts', function(req, res, next) {
  pool.connect((err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }

    //Variables to be used in the query
    var searchQuery = JSON.parse(req.body.query);
    var year = req.body.year;
    var rangeLeft = req.body.rangeLeft;
    var rangeRight = req.body.rangeRight;

    var tmp = "select distinct * from (select wordSearch.lemma, wordSearch.startlocationpaper as wordStart, wordSearch.endlocationpaper as wordEnd, citationSearch.sentencenum as citationSentence, wordSearch.sentencenum as wordSentence, citationSearch.startlocationpaper as citationStart, citationSearch.endlocationpaper as citationEnd, citationSearch.citationauthors as citationAuthors, citationSearch.citationyear as citationYear, citationSearch.citationarticletitle as citationArticleTitle , wordSearch.articleid as articleID,  ((( CAST(wordSearch.startlocationpaper as float)+wordSearch.endlocationpaper)/2)/wordSearch.articleCharCount) as percent from wordSearch inner join citationSearch on wordSearch.articleid = citationSearch.articleid and (((((citationSearch.sentencenum - wordSearch.sentencenum) <= "+rangeLeft+") and (citationSearch.sentencenum - wordSearch.sentencenum) >= 0)) or ((((wordSearch.sentencenum - citationSearch.sentencenum) <= "+rangeRight+") and (wordSearch.sentencenum - citationSearch.sentencenum) >= 0))) where wordSearch.articleyear = "+year+" and (";
    for(var i = 0; i < searchQuery.length; i++){
        tmp += "wordSearch.lemma = '" + searchQuery[i] + "'";
        if(i < searchQuery.length - 1){
          tmp += " or ";
        }
    }
    tmp += " )limit 5000) as result order by articleid, citationSentence, wordStart;";
    const query = client.query(tmp);
   
    
    // Array to store results
    var results = [];
    // Stream results back one row at a time
    query.on('row', (row) => {
      results.push(row);
    });
    
    
    // After all data is returned, close connection and return results
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//Return the text of a paper
router.post('/paperText', function(req, res, next) {
  pool.connect((err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    
    var paper = req.body.articleid;
    const query = client.query("select papertext, articletitle, journaltitle, articleyear from article where article.id = '" + paper + "';");
    
    // Array to store results
    var results = [];
    // Stream results back one row at a time
    query.on('row', (row) => {
      results.push(row);
    });
    
    
    // After all data is returned, close connection and return results
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});

//Return the location of a sentence for a certain article
router.post('/sectionBoundary', function(req, res, next) {
  pool.connect((err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }

    var paper = req.body.articleid;
    var neededBoundaries = JSON.parse(req.body.neededBoundaries);
    var tmp = "select sentence.sentencenum, sentence.startlocationpaper, sentence.endlocationpaper from sentence inner join paragraph on sentence.para_id = paragraph.id inner join article on paragraph.articleid_id = article.id and article.id = '" + paper + "' where (";
    
    //Get location for all needed sentences
    for(var i = 0 ; i < neededBoundaries.length; i++){
      tmp += "(sentence.sentencenum = " + neededBoundaries[i][0] + " or sentence.sentencenum = " + neededBoundaries[i][1] + ")";
      if(i != neededBoundaries.length - 1){
        tmp += " or ";
      }
    }
    tmp += ");";
    const query = client.query(tmp);
    
    
    
    // Array to store results
    var results = [];
    // Stream results back one row at a time
    query.on('row', (row) => {
      results.push(row);
    });
    
    
    // After all data is returned, close connection and return results
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});


//Same as queryCounts, but only for a specific paper
router.post('/queryCountsPaper', function(req, res, next) {
  pool.connect((err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }

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

    const query = client.query(tmp);
    
    // Array to store results
    var results = [];
    // Stream results back one row at a time
    query.on('row', (row) => {
      results.push(row);
    });
    
    
    // After all data is returned, close connection and return results
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});