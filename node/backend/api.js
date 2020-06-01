const pool = require("./database");
const express = require("express");

const HTTP_CODES = {
  SUCCESS: 200,
  INVALID_DATA_TYPE: 400,
  INVALID_VALUES: 422,
};
/**********************On restart clear temporary table map **************************/
pool.query("SELECT clean_up_user_result_tables()"); //function is a user defined function stored in db
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
 * @param {Request} req
 */
const loggedIn = (req) => {
  return req.session.id && req.session.user;
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
 * this is called before a new search, the temporary table will house all results. The table is necessary for filtering on the paper views page.
 * @param {Request} req
 */
const createTempTable = async (req) => {
  const prefixTableName = "user_temp_table_";
  //check if user has their own temp table
  const result = await pool.query(
    "SELECT * FROM table_map_temp WHERE table_owner=$1",
    [req.session.user]
  );
  //get user id
  const userInfo = await pool.query("SELECT id FROM users WHERE email=$1", [
    req.session.user,
  ]);
  if (!result.rowCount) {
    //create user temp table to store their query result in for subset manipulation
    await pool.query(
      `CREATE TABLE ${
        prefixTableName + userInfo.rows[0].id
      }(id int, ftc int[], words int[], citation_location int[], num_ow int, num_os int, p_year int)`
    );
    await pool.query(
      "INSERT INTO table_map_temp(table_name,creation_date,table_owner) VALUES($1, $2, $3)",
      [prefixTableName + userInfo.rows[0].id, new Date(), req.session.user]
    );
  } else {
    //temp user table already exists, clear the table for new data and update the table_map_temp table to reflect the new date
    await pool.query(`TRUNCATE ${result.rows[0].table_name}`);
    await pool.query(
      "UPDATE table_map_temp SET creation_date=$1 WHERE table_owner=$2",
      [new Date(), req.session.user]
    );
  }
  req.session.tableName = prefixTableName + userInfo.rows[0].id;
};
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
  const result = await pool.query(
    "SELECT sq.id FROM (SELECT id,full_text_citations, jsonb_array_castint(full_text_words->$1) AS words FROM pubmed_text) AS sq WHERE get_citation_range(sq.words, sq.full_text_citations, $2, $3) = true",
    [sentInfo.term, -sentInfo.range[0], sentInfo.range[1]]
  );
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 * @todo fix the static years for the returned result
 */
const citationSearch = async (req, res) => {
  if (!loggedIn(req)) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("not logged in");
    return;
  }
  const rule = req.body.rule;
  if (!validRule(rule)) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  //should check / get the rules here for now single search
  //create temp table to store results in
  await createTempTable(req);
  //get the result of the search and store in the user temporary table
  await pool.query(
    `INSERT INTO ${req.session.tableName} SELECT * FROM get_matrix($1, $2, $3);`,
    [rule.term, rule.range[0], rule.range[1]]
  );
  //once it is stored in the users temporary table we can now do subsequent manipulation to the subset py querying the req.session.tableName
  const aggResults = await pool.query(`SELECT * FROM ${req.session.tableName}`);
  let result = {};
  for (let i = 2003; i <= 2020; ++i) {
    result[i] = {
      content: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      max: 0,
    };
  }
  if (aggResults.rowCount) {
    //move the results of the query into an object. The object is legacy format to support the frontend
    const numOfBins = 10;
    for (let i = 0; i < aggResults.rows.length; ++i) {
      for (let j = 0; j < aggResults.rows[i].citation_location.length; ++j) {
        const idx = Math.floor(
          (aggResults.rows[i].citation_location[j] /
            aggResults.rows[i].num_os) *
            numOfBins
        );
        result[aggResults.rows[i].p_year]["content"][idx] += 1;
      }
    }
    for (let i = 2003; i <= 2020; ++i) {
      result[i].max = Object.values(result[i]["content"]).reduce(
        (a, b) => a + b,
        0
      );
    }
    res.status(HTTP_CODES.SUCCESS).send(result);
    return;
  }
  res.status(HTTP_CODES.INVALID_VALUES);
};

/**
 *
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
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const years = (req, res) => {
  const result = [];
  for (let i = 2005; i <= 2020; ++i) {
    result.push({ articleyear: i });
  }
  res.send(result);
};

module.exports = { years, citationSearch };
