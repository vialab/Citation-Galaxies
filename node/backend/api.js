const pool = require("./database");
const express = require("express");
const apiSchema = require("./resources/apiSchema.json");
const dbSchema = require("./resources/dbschema.json");
const Data = require("./dataLayer");
const fs = require("fs");

const HTTP_CODES = {
  SUCCESS: 200,
  INVALID_DATA_TYPE: 400,
  INVALID_VALUES: 422,
  FORBIDDEN: 403,
};
const RULE_OPERATORS = {
  DEFAULT: 0,
  OR: 1,
  AND: 2,
  NOT: 3,
};
/**********************On restart clear temporary table map **************************/
//pool.query("SELECT clean_up_user_result_tables()"); //function is a user defined function stored in db
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
    if (!(keys[idx] in body)) {
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
  let result = true;
  for (let i = 1; i < rules.length; ++i) {
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
/**
 *
 * @param {Array.<string>} selection
 * each string should look like 'year-start-end'
 */
const convertSelection = (selection) => {
  const SELECT_MAP = ["year", "start", "end"];
  let result = [];
  for (let i = 0; i < selection.length; ++i) {
    let bin = {};
    let buffer = selection[i].split("-");
    for (let j = 0; j < SELECT_MAP.length; ++j) {
      bin[SELECT_MAP[j]] = Number(buffer[j]);
    }
    result.push(bin);
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
      }(id int REFERENCES pubmed_text(id) UNIQUE, citation_location int[], num_ow int, num_os int, p_year int, rule_set_id int[])`
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
 * @todo fix the static years for the returned result
 */
const citationSearch = async (req, res) => {
  const rule = req.body.rule;
  if (!validRule(rule)) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const rule_info = { queries: [], shortList: null };
  if (req.session.tableName) {
    let rules = await getRules(req.session.tableName, rule.term);
    if (rules) {
      rule_info.shortList = await getShortList(rules.where);
      //TODO need to aggregate
      for (let i = 0; i < rules.rules.length; ++i) {
        let query = sub_rule_query(
          rules.rules[i].rules,
          rules.rules[i].rule_set_id
        );
        rule_info.queries.push(
          `INSERT INTO ${req.session.tableName}(id, citation_location, num_ow, num_os, p_year, rule_set_id) ` +
            query +
            `ON CONFLICT (id) DO UPDATE SET citation_location=array_cat(${req.session.tableName}.citation_location, EXCLUDED.citation_location), rule_set_id=array_cat(${req.session.tableName}.rule_set_id, EXCLUDED.rule_set_id)`
        );
      }
    }
  }
  //create temp table to store results in
  await createTempTable(req);
  if (rule_info.queries.length) {
    let promises = [];
    for (let i = 0; i < rule_info.queries.length; ++i) {
      promises.push(pool.query(rule_info.queries[i], [rule_info.shortList]));
    }
    await Promise.all(promises);
  } else {
    //assign the rules to the temp
    await pool.query(
      "UPDATE table_map_temp SET initial_search=ROW($1,$2,$3,$4) WHERE table_owner=$5",
      [rule.term, rule.range[0], rule.range[1], 0, req.session.user]
    );
    //get the result of the search and store in the user temporary table
    await pool.query(
      `INSERT INTO ${req.session.tableName} SELECT * FROM get_matrix($1, $2, $3);`,
      [rule.term, rule.range[0], rule.range[1]]
    );
  }
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
 * @param {string} table_name user temp table name
 */
const getRules = async (tableName, searchTerm) => {
  //get rule set ids for our instance
  const ruleSetIds = await pool.query(
    "SELECT id FROM user_rule_sets WHERE table_name=$1",
    [tableName]
  );
  //if no rule sets return null
  if (!ruleSetIds.rowCount) {
    return null;
  }
  const ids = ruleSetIds.rows.map((x) => {
    return x.id;
  });
  //get individual rules
  const rules = await pool.query(
    "SELECT * FROM user_rules WHERE rule_set_id=ANY($1::int[]) ORDER BY rule_set_id",
    [ids]
  );
  if (!rules.rowCount) {
    return null;
  }
  //comprise a filter to create a short list
  let column = "full_text_words";
  let whereClause = "";
  for (let i = 0; i < rules.rows.length; ++i) {
    const rule = rules.rows[i].rules;
    for (let j = 0; j < rule.length; ++j) {
      const operator = rule[j].operator != null ? rule[j].operator : "OR";
      whereClause += `${operator} ${column} ? '${rule[j].term}' `;
    }
  }
  whereClause += `OR ${column} ? '${searchTerm}'`;
  //get rid of the initial OR
  return { where: whereClause.slice(2), rules: rules.rows };
};

const sub_rule_query = (rule, ruleId, column = "full_text_words") => {
  let result = `SELECT pt.id, array_agg(ftc), pt.num_ow, pt.num_os, pt.year, array_agg(${ruleId}) FROM (SELECT ${column},pubmed_text.id as id, pubmed_text.full_text_citations, pubmed_meta.year as year, pubmed_data.num_of_words as num_ow, pubmed_data.num_of_sentences as num_os FROM pubmed_text INNER JOIN pubmed_data ON pubmed_text.id=pubmed_data.id INNER JOIN pubmed_meta ON pubmed_text.id=pubmed_meta.id WHERE pubmed_text.id=ANY($1::int[])) as pt, unnest(pt.full_text_citations) as ftc, `;
  //This is an example query left here to show the goal of this function.
  /*  "select pt.id, 'rule_name' from (select * from pubmed_text where id=any()) as pt, jsonb_array_elements(pt.full_text_words->'heart') as heart,jsonb_array_elements(pt.full_text_words->'cancer') as cancer, unnest(pt.full_text_citations) as ftc \
  where (heart::int-ftc>=0 and heart::int-ftc<=0 or heart::int-ftc<=0 and heart::int-ftc>=0) AND cancer::int-ftc>=0 and cancer::int-ftc<=0 or cancer::int-ftc<=0 and cancer::int-ftc>=0;";
  */
  for (let i = 0; i < rule.length; ++i) {
    result += `jsonb_array_elements(pt.${column}->'${rule[i].term}') as rule_${i},`;
  }
  //remove end comma
  result = result.slice(0, -1);
  result += " WHERE ";

  //create where clause
  for (let i = 0; i < rule.length; ++i) {
    result += `${
      rule[i].operator == undefined ? "(" : rule[i].operator + " ("
    } rule_${i}::int-ftc>=0 AND rule_${i}::int-ftc<=${
      rule[i].range[0]
    } OR rule_${i}::int-ftc<=0 AND rule_${i}::int-ftc>=${-rule[i].range[1]}) `;
  }
  //group by clause to group duplicates
  result += "GROUP BY pt.id, pt.year, pt.num_ow, pt.num_os ";
  return result;
};
/**
 * @param {string} whereClause
 */
const getShortList = async (whereClause) => {
  const result = await pool.query(
    `SELECT id FROM pubmed_text WHERE ${whereClause}`
  );
  return result.rows.map((x) => x.id);
};
/**
 * @todo store the rule that hit in the temp tables for further use.
 * @param {Request} req
 * @param {Response} res
 *
 * papers
 */
const getPapers = async (req, res) => {
  //check if we have a tablename stored in the session data
  if (!req.session.tableName) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("not logged in");
    return;
  }
  const requiredInfo = { selections: [], rangeLeft: 0, rangeRight: 0 };
  let sentInfo = reqValid(requiredInfo, req);
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("not logged in");
  }
  let bins = convertSelection(sentInfo.selections);
  let result = {};
  let tableResults = await pool.query(
    `SELECT citation_location, p_year as year, title, sentences, pubmed_data.id, num_os, rule_set_id FROM ${req.session.tableName} INNER JOIN pubmed_data ON ${req.session.tableName}.id=pubmed_data.id WHERE p_year = ANY($1::int[])`,
    [
      bins.map((x) => {
        return x.year;
      }),
    ]
  );
  //get rules
  let rules = await pool.query(
    `SELECT user_rule_sets.*, ARRAY(SELECT rules FROM user_rules WHERE rule_set_id=user_rule_sets.id) AS rules FROM user_rule_sets, (SELECT DISTINCT UNNEST(rule_set_id) AS ids FROM ${req.session.tableName} WHERE p_year=ANY($1::int[])) as rule_id WHERE id=rule_id.ids`,
    [
      bins.map((x) => {
        return x.year;
      }),
    ]
  );
  //used to convert the rule map
  let ruleMap = {};
  for (let i = 0; i < rules.rows.length; ++i) {
    ruleMap[rules.rows[i].id] = rules.rows[i];
  }
  //check if any results were returned, there should be results at this point
  if (!tableResults.rowCount) {
    res.status(HTTP_CODES.SUCCESS).send(result);
    return;
  }
  let globalMax = 0;
  let papers = {};
  let ruleHits = {};
  let sentenceHits = {};
  const numOfBins = 9;
  const selectedBins = bins.map((x) => {
    return x.start / (numOfBins + 1);
  });
  for (let i = 0; i < tableResults.rows.length; ++i) {
    let content = {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0,
      "8": 0,
      "9": 0,
    };
    let row = tableResults.rows[i];
    let citationRuleMap = {};
    const unique_citation = Array.from(new Set(row.citation_location));
    unique_citation.map((x) => {
      citationRuleMap[x] = [];
    });
    for (let j = 0; j < row.citation_location.length; ++j) {
      citationRuleMap[row.citation_location[j]].push(row.rule_set_id[j]);
    }
    papers[row.id] = {};
    ruleHits[row.id] = [];
    //get the content hits for the paper glyph
    for (let k = 0; k < row.citation_location.length; ++k) {
      content[
        Math.floor((row.citation_location[k] / row.num_os) * numOfBins)
      ] += 1;
    }
    let correctBin = false;
    for (let l = 0; l < selectedBins.length; ++l) {
      if (content[selectedBins[l]]) {
        correctBin = true;
        break;
      }
    }
    if (!correctBin) {
      delete papers[row.id];
      continue;
    }
    papers[row.id]["content"] = content;
    papers[row.id]["year"] = row.year;
    sentenceHits[row.id] = [];
    papers[row.id]["max"] = Math.max(...Object.values(content));
    papers[row.id]["total"] = Object.values(content).reduce((a, b) => a + b, 0);
    globalMax = Math.max(globalMax, papers[row.id]["max"]);
    //generate the text for the vis
    for (let j = 0; j < unique_citation.length; ++j) {
      //make sure it does not go into the negative
      const leftIdx = Math.max(0, unique_citation[j] - sentInfo.rangeLeft);
      //make sure it does not index outside of the array
      const rightIdx = Math.min(
        row.sentences.length,
        unique_citation[j] + sentInfo.rangeRight + 1
      ); // +1 due to exclusion clause
      let text = row.sentences.slice(leftIdx, rightIdx);
      sentenceHits[row.id].push(text);
      ruleHits[row.id].push(
        citationRuleMap[unique_citation[j]].map((x) => {
          return ruleMap[x];
        })
      );
    }
  }
  result.papers = papers;
  result.ruleHits = ruleHits;
  result.sentenceHits = sentenceHits;
  result.years = bins.map((x) => {
    return x.year;
  });
  result.max = globalMax;
  res.status(HTTP_CODES.SUCCESS).send(result);
  return;
};
/**
 * @param {Request} req
 * @param {Response} res
 */
const checkExistingWork = async (req, res) => {
  const queryResult = await pool.query(
    "SELECT table_name FROM table_map_temp WHERE table_owner=$1",
    [req.session.user]
  );
  if (!queryResult.rowCount) {
    //does not exist
    res.status(200).send({ exists: 0 });
    return;
  }
  res.status(200).send({ exists: 1 });
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const loadExistingWork = async (req, res) => {
  //check if table exists
  const queryResult = await pool.query(
    "SELECT table_name, jsonb_build_object('term', (initial_search).term, 'range_left', (initial_search).range_left, 'range_right', (initial_search).range_right, 'operator', (initial_search).operator) as info FROM table_map_temp WHERE table_owner=$1",
    [req.session.user]
  );
  if (!queryResult.rowCount) {
    res.status(HTTP_CODES.INVALID_VALUES);
    return;
  }
  let row = queryResult.rows[0];
  //set the table name for the session
  req.session.tableName = row.table_name;

  const aggResults = await pool.query(`SELECT * FROM ${req.session.tableName}`);
  let result = {};
  const queryInfo = queryResult.rows[0].info;
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
    res.status(HTTP_CODES.SUCCESS).send({ info: queryInfo, result: result });
    return;
  }
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const getPaper = async (req, res) => {
  const requiredInfo = { paper_id: 0 };
  let sentInfo = reqValid(requiredInfo, req);
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const paperInfo = await pool.query(
    "SELECT * FROM pubmed_data INNER JOIN pubmed_meta ON pubmed_data.id=pubmed_meta.id INNER JOIN pubmed_text ON pubmed_data.id=pubmed_text.id WHERE pubmed_data.id=$1",
    [sentInfo.paper_id]
  );
  if (!paperInfo.rowCount) {
    res.status(HTTP_CODES.SUCCESS).send(null);
    return;
  }
  res.status(HTTP_CODES.SUCCESS).send({
    articletitle: paperInfo.rows[0].title,
    journaltitle: paperInfo.rows[0].journal,
    articleyear: paperInfo.rows[0].year,
  });
};
/***************************************INDIVIDUAL RULES************************************************/
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const loadRules = async (req, res) => {
  const requiredInfo = { signalcategoryid: 0, table_name: "" };
  let sentInfo = reqValid(requiredInfo, { body: req.body.values });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const result = await pool.query(
    "SELECT id, rules FROM user_rules WHERE rule_set_id=$1",
    [sentInfo.signalcategoryid]
  );
  const isEmpty = (property) => {
    if (!property) {
      return {};
    }
    return property;
  };
  let rules = result.rows;
  if (!result.rowCount) {
    rules = [];
  }
  const tableInfo = apiSchema[sentInfo.table_name];
  const parent_col = tableInfo["parent"];
  const parent_id = req.body.values[parent_col];
  let parent = {};
  if (parent_col && parent_id) {
    parent = { id: parent_id, col: parent_col };
  }
  res.status(HTTP_CODES.SUCCESS).send({
    data: rules,
    aliases: isEmpty(tableInfo.aliases),
    links: isEmpty(tableInfo.links),
    actions: isEmpty(tableInfo.actions),
    name: sentInfo.table_name,
    schema: isEmpty(dbSchema[tableInfo["origin"]]),
    parent: isEmpty(parent),
  });
};
const extrapolateRequiredData = (data, schema) => {
  const keys = Object.keys(schema);
  let result = [];
  for (let j = 0; j < data.length; ++j) {
    let tableInfo = {};
    //this is for legacy
    tableInfo.id = data[j].id;
    for (let i = 0; i < keys.length; ++i) {
      tableInfo[keys[i]] = data[j][keys[i]];
      if (data[j][keys[i]] == null) {
        return [];
      }
    }
    result.push(tableInfo);
  }
  return result;
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const addRule = async (req, res) => {
  const requiredInfo = { signalcategoryid: 0, rules: {} };
  let sentInfo = reqValid(requiredInfo, { body: req.body.values });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  sentInfo.rules = JSON.parse(sentInfo.rules);
  if (!validRules(sentInfo.rules)) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  await pool.query("INSERT INTO user_rules(rule_set_id, rules) VALUES($1,$2)", [
    sentInfo.signalcategoryid,
    JSON.stringify(sentInfo.rules),
  ]);
  res.status(200).send({});
  return;
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const updateRule = async (req, res) => {
  const requiredInfo = { id: 0, rules: {} };
  let sentInfo = reqValid(requiredInfo, { body: req.body.values });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  sentInfo.rules = JSON.parse(sentInfo.rules);
  if (!validRules(sentInfo.rules)) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  await pool.query("UPDATE user_rules SET rules=$2 WHERE id=$1", [
    sentInfo.id,
    JSON.stringify(sentInfo.rules),
  ]);
  res.status(HTTP_CODES.SUCCESS).send({});
};

const deleteRule = async (req, res) => {
  const requiredInfo = { id: 0 };
  let sentInfo = reqValid(requiredInfo, req);
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  await pool.query("DELETE FROM user_rules WHERE id=$1", [sentInfo.id]);
  res.status(HTTP_CODES.SUCCESS).send({});
};

/************************************************************RULE SETS ************************************************************/
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const loadRuleSets = async (req, res) => {
  const requireInfo = { table_name: "" };
  let sentInfo = reqValid(requireInfo, { body: req.body.values });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const result = await pool.query(
    "SELECT * FROM user_rule_sets WHERE table_name=$1",
    [req.session.tableName]
  );
  const isEmpty = (property) => {
    if (!property) {
      return {};
    }
    return property;
  };
  const tableInfo = apiSchema[sentInfo.table_name];
  const parent_col = tableInfo["parent"];
  const parent_id = req.body.values[parent_col];
  let parent = {};
  if (parent_col && parent_id) {
    parent = { id: parent_id, col: parent_col };
  }
  res.status(HTTP_CODES.SUCCESS).send({
    data: isEmpty(extrapolateRequiredData(result.rows, tableInfo.aliases)),
    aliases: isEmpty(tableInfo.aliases),
    links: isEmpty(tableInfo.links),
    actions: isEmpty(tableInfo.actions),
    name: sentInfo.table_name,
    schema: isEmpty(dbSchema[tableInfo["origin"]]),
    parent: isEmpty(parent),
  });
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const addRuleSet = async (req, res) => {
  const requiredInfo = { name: "", color: 0 };
  let sentInfo = reqValid(requiredInfo, { body: req.body.values });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const result = await pool.query(
    "INSERT INTO user_rule_sets(user_id, name, color, table_name) VALUES($1,$2,$3,$4) RETURNING id",
    [req.session.user_id, sentInfo.name, sentInfo.color, req.session.tableName]
  );
  if (!result.rowCount) {
    res.status(HTTP_CODES.INVALID_VALUES);
    return;
  }
  res.status(HTTP_CODES.SUCCESS).send();
  return;
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const updateRuleSet = async (req, res) => {
  const requiredInfo = { id: 0, name: "", color: 0 };
  let sentInfo = reqValid(requiredInfo, { body: req.body.values });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const result = await pool.query(
    "UPDATE user_rule_sets SET name=$1, color=$2 WHERE id=$3",
    [sentInfo.name, sentInfo.color, sentInfo.id]
  );
  res.status(HTTP_CODES.SUCCESS).send({});
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const deleteRuleSet = async (req, res) => {
  const requiredInfo = { id: 0 };
  let sentInfo = reqValid(requiredInfo, req);
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  let results = await pool.query(
    "DELETE FROM user_rules WHERE rule_set_id=$1",
    [sentInfo.id]
  );
  results = await pool.query("DELETE FROM user_rule_sets WHERE id=$1", [
    sentInfo.id,
  ]);
  res.status(200).send({});
  return;
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const addRuleToQuery = async (req, res) => {};
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
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const exportData = async (req, res) => {
  //input validation
  const requiredInfo = {
    isJSON: true,
    dataOptions: {},
    meta: {},
    ruleSets: {},
  };
  const input = JSON.parse(req.query.query);
  let sentInfo = reqValid(requiredInfo, { body: input });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  //create data object in charge of streaming from db to file
  const data = new Data(
    sentInfo.isJSON,
    req.session.tableName,
    sentInfo.dataOptions,
    sentInfo.meta,
    sentInfo.ruleSets
  );
  //if delimiter assign
  if (input.delimiter != undefined) {
    data.delimiter = input.delimiter;
  }
  //returns the fileName that has the required information
  const fileName = await data.export();
  //send to client
  res.download(fileName, "data." + data.fileExtension, function (err) {
    if (err) {
      console.error(err);
      //delete file there was an error
      fs.unlink(fileName, (err) => {
        if (err) console.error(err);
      });
    } else {
      //delete file the client has received it
      fs.unlink(fileName, (err) => {
        if (err) console.error(err);
      });
    }
  });
};

const getFilterNames = async (req, res) => {
  const requiredInfo = { filter: "", currentValue: "" };
  let sentInfo = reqValid(requiredInfo, { body: req.query });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const limit = 5;
  const filters = {
    JOURNAL: "journal",
    TITLE: "title",
    AUTHORS: "authors",
    AFFILIATION: "affiliation",
  };
  let select = filters[sentInfo.filter];
  if (!select) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const result = await pool.query(
    `SELECT DISTINCT ${select} FROM ${req.session.tableName} AS utt INNER JOIN pubmed_meta ON utt.id=pubmed_meta.id WHERE ${select} ~* $1 LIMIT $2`,
    ["^" + sentInfo.currentValue, limit]
  );
  res.status(HTTP_CODES.SUCCESS).send(
    result.rows.map((x) => {
      return x[select];
    })
  );
  return;
};

module.exports = {
  years,
  citationSearch,
  getPapers,
  getPaper,
  checkExistingWork,
  loadExistingWork,
  deleteRuleSet,
  updateRuleSet,
  loadRuleSets,
  addRule,
  updateRule,
  deleteRule,
  addRuleSet,
  loadRules,
  exportData,
  getFilterNames,
};
