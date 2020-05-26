const pool = require("./database");
const express = require("express");

// 3 different types of queries [sentences, words, [sentences relative to citation, words relative to citation]]
//two different datasets [erudit, pubmed]
//regex
//supported operations OR AND NOT
/**********************validation functions ********************************/
/**
 *
 * @param {JSON} expectedKeys
 * @param {Request} req
 */
const reqValid = (expectedKeys, req) => {
  const keys = Object.keys(expectedKeys);
  const body = req.body;
  for (const idx in keys) {
    if (!keys[idx] in body) {
      return null;
    }
    expectedKeys[keys[idx]] = body[keys[idx]];
  }
  return expectedKeys;
};
/**
 *
 * @param {{range:Number[], term:string}} rule
 */
const validRule = (rule) => {
  if (!("range" in rule)) {
    return false;
  }
  if (rule.range.length != 2) {
    return false;
  }
  if (!("term" in rule)) {
    return false;
  }
  if (rule.term == "") {
    return false;
  }
  return true;
};
/**
 *
 * @param {Array.<{range:Number[], term:string, operator:string}>} rules
 */
const validRules = (rules) => {
  const result = true;
  for (const i = 0; i < rules.length; ++i) {
    result = result && validRule(rules[i]);
    if (!result) {
      return result;
    }
    if (!("operator" in rules[i])) {
      result = false;
      return result;
    }
    switch (rules[i].operator) {
      case "AND":
        break;
      case "OR":
        break;
      case "NOT":
        break;
      default:
        result = false;
        return result;
        break;
    }
  }
  return result;
};
/***************************basic query functions **********************/
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const singleSearchCitation = async (req, res) => {
  const requiredInfo = { rule: { range: [], term: "" } };
  let sentInfo = reqValid(requiredInfo, req);
  if (sentInfo == null) {
    res.status(400).send("invalid data");
    return;
  }
  if (!validRule(sentInfo.rule)) {
    res.status(404).send("invalid values");
  }
  //everything is good, time to query
  const {
    result,
  } = await pool.query(
    "SELECT count(*) FROM (SELECT full_text_citations, jsonb_array_castint(full_text_words->$1) AS words FROM pubmed_text) AS sq WHERE get_citation_range(sq.words, sq.full_text_citations, $2) = true",
    [sentInfo.term, sentInfo.range[0]]
  );
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const multiRuleSearchCitation = async (req, res) => {
  const requiredInfo = { rules: [] };
  //error checking
  const sentInfo = reqValid(requiredInfo, req);
  if (sentInfo == null) {
    res.status(404).send("invalid data");
    return;
  }
  if (!validRules(sentInfo)) {
    res.status(404).send("invalid values");
    return;
  }
  //everything is good, time to query
};

/***************************************regex section***************************************/
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const multiRuleSearchRegexCitation = async (req, res) => {
  const requiredInfo = { rules: [] };
  //error checking
  const sentInfo = reqValid(requiredInfo, req);
  if (sentInfo == null) {
    res.status(404).send("invalid data");
    return;
  }
  if (!validRules(sentInfo)) {
    res.status(404).send("invalid values");
    return;
  }
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const singleSearchRegexCitation = async (req, res) => {
  const requiredInfo = { rule: { range: [], term: "" } };
  let sentInfo = reqValid(requiredInfo, req);
  if (sentInfo == null) {
    res.status(400).send("invalid data");
    return;
  }
  if (!validRule(sentInfo.rule)) {
    res.status(404).send("invalid values");
  }
  //everything is good, time to query
  const {
    result,
  } = await pool.query(
    "SELECT count(*) FROM (SELECT full_text_citations, jsonb_array_castint(full_text_words->$1) AS words FROM pubmed_text) AS sq WHERE get_citation_range(sq.words, sq.full_text_citations, $2) = true",
    [sentInfo.term, sentInfo.range[0]]
  );
};
/*************************misc api ******************/
const years = (res, req) => {
  const result = [];
  for (const i = 2005; i <= 2020; ++i) {
    result.push({ articleyear: i });
  }
  res.json(result);
};

module.exports = { years };
