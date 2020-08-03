const pool = require("./database");
const apiSchema = require("./resources/apiSchema.json");
const dbSchema = require("./resources/dbschema.json");
const { DataExport, DataLayer } = require("./dataLayer");
const fs = require("fs");
const DATA_LAYER = new DataLayer();
function generate(min, max) {
  let result = [];
  for (let i = min; i <= max; ++i) {
    result.push(i);
  }
  return result;
}
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
 * @todo store the rule that hit in the temp tables for further use.
 * @param {Request} req
 * @param {Response} res
 *
 * papers
 */
const getPapers = async (req, res) => {
  //check if we have a tablename stored in the session data
  const requiredInfo = {
    selections: [],
    rangeLeft: 0,
    rangeRight: 0,
    isPubmed: false,
  };
  let sentInfo = reqValid(requiredInfo, req);
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("not logged in");
  }
  let bins = convertSelection(sentInfo.selections);
  if (!sentInfo.isPubmed) {
    res
      .status(HTTP_CODES.SUCCESS)
      .send(await DATA_LAYER.erudit.getPapers(req.session.tableName, bins));
  } else {
    res
      .status(HTTP_CODES.SUCCESS)
      .send(
        await DATA_LAYER.pubmed.getPapers(
          req.session.tableName,
          sentInfo.rangeLeft,
          sentInfo.rangeRight,
          bins
        )
      );
  }
};
/**
 * @param {Request} req
 * @param {Response} res
 */
const checkExistingWork = async (req, res) => {
  const queryResult = await pool.query(
    "SELECT table_name FROM table_map_temp WHERE table_owner=$1",
    [req.session.email]
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
    "SELECT table_name, table_type, jsonb_build_object('term', (initial_search).term, 'range_left', (initial_search).range_left, 'range_right', (initial_search).range_right, 'operator', (initial_search).operator) as info FROM table_map_temp WHERE table_owner=$1",
    [req.session.email]
  );
  if (!queryResult.rowCount) {
    res.status(HTTP_CODES.INVALID_VALUES);
    return;
  }
  let row = queryResult.rows[0];
  //set the table name for the session
  req.session.tableName = row.table_name;
  const aggResults = await pool.query(
    `SELECT * FROM ${req.session.tableName} WHERE p_year=ANY($1::int[])`,
    [generate(2003, 2020)]
  );
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
    res.status(HTTP_CODES.SUCCESS).send({
      info: queryInfo,
      result: result,
      db: queryResult.rows[0].table_type,
    });
    return;
  }
};
const deleteExistingWork = async (req, res) => {
  const result = await DATA_LAYER.ruleSets.read(req.session.tableName);
  if (result.length) {
    await DATA_LAYER.ruleSets.delete(result[0].id);
  }
  await DATA_LAYER.userTable.delete(req.session.tableName);
  res.status(200).send({});
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const getPaper = async (req, res) => {
  let requiredInfo = { paper_id: 0, isPubmed: false };
  let sentInfo = reqValid(requiredInfo, req);
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  if (!sentInfo.isPubmed) {
    const result = await DATA_LAYER.erudit.getPaper(sentInfo.paper_id);
    if (!result.rowCount) {
      res.status(HTTP_CODES.SUCCESS).send(null);
      return;
    }
    res.status(HTTP_CODES.SUCCESS).send({
      articletitle: "",
      journaltitle: result.rows[0].journal,
      articleyear: result.rows[0].year,
    });
  } else {
    const result = await DATA_LAYER.pubmed.getPaper(sentInfo.paper_id);
    if (!result.rowCount) {
      res.status(HTTP_CODES.SUCCESS).send(null);
      return;
    }
    res.status(HTTP_CODES.SUCCESS).send({
      articletitle: result.rows[0].title,
      journaltitle: result.rows[0].journal,
      articleyear: result.rows[0].year,
    });
  }
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
    [req.session.userId, sentInfo.name, sentInfo.color, req.session.tableName]
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
  let isPubmed = true;
  if (!(await DATA_LAYER.userTable.isPubmed(req.session.tableName))) {
    isPubmed = false;
  }
  //create data object in charge of streaming from db to file
  const data = new DataExport(
    sentInfo.isJSON,
    req.session.tableName,
    isPubmed,
    sentInfo.dataOptions,
    sentInfo.meta,
    sentInfo.ruleSets
  );
  //if delimiter assign
  data.delimiter = input.delimiter || data.delimiter;
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
  const requiredInfo = {
    filter: "",
    currentValue: "",
    ids: [],
    isPubmed: false,
  };
  let sentInfo = reqValid(requiredInfo, { body: req.query });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }

  if (sentInfo.isPubmed === "false") {
    let result = await DATA_LAYER.erudit.getFilteredNames(
      sentInfo.filter,
      sentInfo.currentValue,
      sentInfo.ids,
      req.session.tableName
    );
    res.status(HTTP_CODES.SUCCESS).send(result);
    return;
  } else {
    let result = await DATA_LAYER.pubmed.getFilteredNames(
      sentInfo.filter,
      sentInfo.currentValue,
      sentInfo.ids,
      req.session.tableName
    );
    res.status(HTTP_CODES.SUCCESS).send(result);
    return;
  }
};

const getFilteredIDs = async (req, res) => {
  const requiredInfo = { fields: [], ids: [], isPubmed: false };
  let sentInfo = reqValid(requiredInfo, { body: req.query });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  let result = null;
  if (sentInfo.isPubmed === "true") {
    result = await DATA_LAYER.pubmed.getFilteredIDs(
      sentInfo.fields,
      req.session.tableName,
      sentInfo.ids
    );
  } else {
    result = await DATA_LAYER.erudit.getFilteredIDs(
      sentInfo.fields,
      req.session.tableName,
      sentInfo.ids
    );
  }
  res.status(200).send(result);
};

const search = async function (req, res) {
  const requireInfo = {
    rule: {},
    bins: {},
    years: [],
    term: "",
    isPubmed: false,
  };
  let sentInfo = reqValid(requireInfo, req);
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  if (
    ((await DATA_LAYER.userTable.exists(req.session.tableName)) &&
      (await DATA_LAYER.userTable.isPubmed(req.session.tableName))) !=
    sentInfo.isPubmed
  ) {
    let ruleCheck = await DATA_LAYER.ruleSets.read(req.session.tableName);
    if (ruleCheck.length) {
      await Promise.all(
        ruleCheck.map((x) => {
          return DATA_LAYER.ruleSets.delete(x.id);
        })
      );
    }
  }
  //checks if rules exist
  let ruleCheck = await DATA_LAYER.ruleSets.read(req.session.tableName);

  const bins = sentInfo.bins;
  const db = sentInfo.isPubmed ? DATA_LAYER.pubmed : DATA_LAYER.erudit;
  const rule_info = { queries: [], shortList: null };
  if (ruleCheck.length) {
    let rules = await db.getRuleWhereClause(
      req.session.tableName,
      sentInfo.term
    );
    rule_info.shortList = await db.getShortList(rules.where);
    //TODO need to aggregate
    for (let i = 0; i < rules.rules.length; ++i) {
      let query = db.subRuleQuery(
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
  if (rule_info.queries.length) {
    let promises = [];
    for (let i = 0; i < rule_info.queries.length; ++i) {
      promises.push(pool.query(rule_info.queries[i], [rule_info.shortList]));
    }
    await Promise.all(promises);
    let result = await db.getGridVisualization(
      req.session.tableName,
      bins,
      sentInfo.years
    );
    res.status(HTTP_CODES.SUCCESS).send(result);
    return;
  }
  //check which dataset to search
  if (!sentInfo.isPubmed) {
    //should check for rules
    await DATA_LAYER.erudit.search(
      sentInfo.term,
      req.session.tableName,
      req.session
    );
    let result = await DATA_LAYER.erudit.getGridVisualization(
      req.session.tableName,
      bins,
      sentInfo.years
    );
    res.status(HTTP_CODES.SUCCESS).send(result);
  } else {
    await DATA_LAYER.pubmed.search(
      req.session.tableName,
      sentInfo.term,
      sentInfo.rule.range,
      req.session
    );
    let result = await DATA_LAYER.pubmed.getGridVisualization(
      req.session.tableName,
      bins,
      sentInfo.years
    );
    res.status(HTTP_CODES.SUCCESS).send(result);
  }
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const getOverview = async (req, res) => {
  const requiredInfo = { years: [] };
  let sentInfo = reqValid(requiredInfo, { body: req.query });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  let result = await DATA_LAYER.userTable.overview(
    req.session.tableName,
    sentInfo.years
  );
  res.status(HTTP_CODES.SUCCESS).send(result);
};

const updateGrid = async (req, res) => {
  const requiredInfo = { years: [] };
  let sentInfo = reqValid(requiredInfo, { body: req.query });
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE);
    return;
  }
  const bins = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  if (!(await DATA_LAYER.userTable.exists(req.session.tableName))) {
    const end = sentInfo.years.length - 1;
    let result = {};
    for (let i = sentInfo.years[0]; i <= sentInfo.years[end]; ++i) {
      result[i] = {};
      result[i].content = bins;
    }
    res.status(HTTP_CODES.SUCCESS).send(result);
    return;
  }
  let result = await DATA_LAYER.erudit.getGridVisualization(
    req.session.tableName,
    bins,
    sentInfo.years
  );
  res.status(HTTP_CODES.SUCCESS).send(result);
};

module.exports = {
  years,
  getPapers,
  getPaper,
  checkExistingWork,
  loadExistingWork,
  deleteExistingWork,
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
  getFilteredIDs,
  search,
  getOverview,
  updateGrid,
};
