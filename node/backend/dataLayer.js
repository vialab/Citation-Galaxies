const fs = require("fs");
const pool = require("./database");
const Cursor = require("pg-cursor");
const { parseAsync } = require("json2csv");
const socketManager = require("./socketManager");

Cursor.prototype.readAsync = async function (batchSize) {
  return new Promise((resolve, reject) => {
    this.read(batchSize, (err, rows) => {
      if (err) {
        reject(err);
      }
      resolve(rows);
    });
  });
};

fs.WriteStream.prototype.writeSync = async function (data) {
  return new Promise((res, rej) => {
    this.write(data, () => {
      res();
    });
  });
};

const progressAll = async (promises, socketId) => {
  let idx = 1;
  promises.forEach((p) => {
    p.then(() => {
      const end = promises.length;
      const progressVal = Math.floor((idx / end) * 100);
      socketManager.send("progress", progressVal, socketId);
      ++idx;
    });
  });
  return Promise.all(promises);
};
class DataExport {
  /**
   *
   * @param {boolean} isJSON
   * @param {{}} meta
   * @param {Array.<Number>} ruleSets
   */
  constructor(
    isJSON,
    userTableName,
    isPubmed,
    dataOptions = {},
    meta = {},
    ruleSets = {},
    delimiter = ","
  ) {
    this.metaSchema = {
      title: "title",
      journal: "journal",
      authors: "authors",
      affiliation: "affiliation",
      year: "year",
      "pubmed id": "id",
    };
    this.dataSchema = {
      "abstract sentences": "abstract_sentences",
      "abstract words": "abstract_words",
      sentences: isPubmed ? "pubmed_data.sentences" : "erudit_data.sentences",
      words: "words",
      "raw abstract": "full_abstract",
      "raw text": "full_text",
      snippet: "snippets.idx",
    };
    this.tableName = userTableName;
    this.suppliedMeta = meta;
    this.suppliedRuleSets = ruleSets;
    this.suppliedDataOptions = dataOptions;
    this.isJSON = isJSON;
    this.delimiter = delimiter;
    this.fileExtension = isJSON ? "json" : "csv";
    this.encode = isJSON ? this.jsonEncoder : this.csvEncoder;
    this.fileName = this.tableName + "." + this.fileExtension;
    this.checkSchema(this.dataSchema, this.suppliedDataOptions);
    this.checkSchema(this.metaSchema, this.suppliedMeta);
    this.export = isPubmed ? this.pubmedExport : this.eruditExport;
  }
  checkSchema(schema, supplied) {
    const keys = Object.keys(schema);
    for (let i = 0; i < keys.length; ++i) {
      if (!(keys[i] in supplied)) {
        delete schema[keys[i]];
      }
    }
  }
  buildSelection(schema, tableName = null) {
    let keys = Object.keys(schema);
    if (!keys.length) {
      return "";
    }
    let selection = "";
    for (let i = 0; i < keys.length; ++i) {
      selection +=
        tableName != null
          ? tableName + "." + schema[keys[i]] + ", "
          : schema[keys[i]] + ", ";
    }
    return selection;
  }
  async pubmedExport(socketId, batchSize = 100) {
    //create client for this we need to use the pg cursor to stream rather than load everything into memory
    //select max(urr->'range'->>0) as left, max(urr->'range'->>1) as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id;
    //select res from (select cl-rinfo.left, cl+rinfo.right, utt3.id from pubmed_data,user_temp_table_3 as utt3,unnest(utt3.citation_location) as cl, unnest(utt3.rule_set_id) as rsd, (select max(urr->'range'->>0)::int as left, max(urr->'range'->>1)::int as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id) as rinfo where rsd=rinfo.rule_set_id) as res
    //select pubmed_data.sentences[(select greatest(res.l,0)):(select least(res.r, array_length(pubmed_data.sentences,1)))] from pubmed_data, (select cl-rinfo.left as l, cl+rinfo.right as r, utt3.id as id from pubmed_data,user_temp_table_3 as utt3,unnest(utt3.citation_location) as cl, unnest(utt3.rule_set_id) as rsd, (select max(urr->'range'->>0)::int as left, max(urr->'range'->>1)::int as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id) as rinfo where rsd=rinfo.rule_set_id) as res where pubmed_data.id=res.id;
    const client = await pool.connect();
    const minYear = 2003;
    const maxYear = 2020;

    try {
      const ws = fs.createWriteStream(this.fileName, { encoding: "utf8" });
      for (let j = maxYear; j >= minYear; --j) {
        let dataSelect = this.buildSelection(this.dataSchema);
        const metaSelect = this.buildSelection(
          this.metaSchema,
          "pubmed_meta"
        ).slice(0, -2);
        if (metaSelect.length === 0) {
          //remove comma as the meta select is not part of the query
          dataSelect = dataSelect.slice(0, -2);
        }
        const queryString = `SELECT ${dataSelect}${metaSelect} FROM ${this.tableName} INNER JOIN (select array_agg((cl-rinfo.left, cl+rinfo.right)) as idx, utt3.id from ${this.tableName} as utt3 cross join unnest(utt3.citation_location) as cl cross join unnest(utt3.rule_set_id) as rsd cross join (select max(urr->'range'->>0)::int as left, max(urr->'range'->>1)::int as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id) as rinfo where rsd=rinfo.rule_set_id group by utt3.id) as snippets ON ${this.tableName}.id=snippets.id INNER JOIN pubmed_data_${j} as pubmed_data ON ${this.tableName}.id=pubmed_data.id INNER JOIN pubmed_meta_${j} as pubmed_meta ON ${this.tableName}.id=pubmed_meta.id WHERE rule_set_id && $1::int[] AND p_year=${j}`;
        //use cursor
        const cursor = await client.query(
          new Cursor(queryString, [this.suppliedRuleSets])
        );
        let result = null;
        if (this.isJSON) {
          //manually writing each object into a json array
          //as far as I am aware streaming a json array to file is not a thing
          if (j == maxYear) {
            ws.write("[");
          }
          do {
            //read the batchsize of rows
            result = await cursor.readAsync(batchSize);
            //write to file
            for (let i = 0; i < result.length; ++i) {
              const encodedData = this.encode(result[i]);
              await ws.writeSync(encodedData + ",");
            }
          } while (result.length);
          if (j == minYear) {
            await ws.writeSync("]");
          }
        } else {
          do {
            //read the batchsize of rows
            result = await cursor.readAsync(batchSize);
            //write to file
            for (let i = 0; i < result.length; ++i) {
              const encodedData = await this.encode(result[i]);
              await ws.writeSync(encodedData);
            }
          } while (result.length);
        }
        const distanceToEnd = j - minYear;
        const totalDistance = maxYear - minYear;
        socketManager.send(
          "progress",
          100 - (distanceToEnd / totalDistance) * 100,
          socketId
        );
        //clean up cursor
        cursor.close(() => {});
      }
      //cleanup file
      ws.end();
    } catch (err) {
      console.error("Export Error:" + err.message);
      ws.end();
      fs.unlink(this.fileName);
    }

    //return pipe to send to user
    return this.fileName;
  }
  async eruditExport(socketId, batchSize = 100) {
    const client = await pool.connect();
    let dataSelect = this.buildSelection(this.dataSchema);
    const metaSelect = this.buildSelection(
      this.metaSchema,
      "erudit_meta"
    ).slice(0, -2);
    if (metaSelect.length === 0) {
      //remove comma as the meta select is not part of the query
      dataSelect = dataSelect.slice(0, -2);
    }
    const queryString = `SELECT ${dataSelect}${metaSelect} FROM ${this.tableName} INNER JOIN (select array_agg((cl-rinfo.left, cl+rinfo.right)) as idx, utt3.id from ${this.tableName} as utt3 cross join unnest(utt3.citation_location) as cl cross join unnest(utt3.rule_set_id) as rsd cross join (select max(urr->'range'->>0)::int as left, max(urr->'range'->>1)::int as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id) as rinfo where rsd=rinfo.rule_set_id group by utt3.id) as snippets ON ${this.tableName}.id=snippets.id INNER JOIN erudit_data ON ${this.tableName}.id=erudit_data.id INNER JOIN erudit_meta ON ${this.tableName}.id=erudit_meta.id WHERE rule_set_id && $1::int[]`;
    //use cursor
    const cursor = await client.query(
      new Cursor(queryString, [this.suppliedRuleSets])
    );
    try {
      const ws = fs.createWriteStream(this.fileName, { encoding: "utf8" });
      let result = null;
      if (this.isJSON) {
        //manually writing each object into a json array
        //as far as I am aware streaming a json array to file is not a thing
        ws.write("[");
        do {
          //read the batchsize of rows
          result = await cursor.readAsync(batchSize);
          //write to file
          for (let i = 0; i < result.length; ++i) {
            const encodedData = this.encode(result[i]);
            await ws.writeSync(encodedData + ",");
          }
        } while (result.length);
        await ws.writeSync("]");
      } else {
        do {
          //read the batchsize of rows
          result = await cursor.readAsync(batchSize);
          //write to file
          for (let i = 0; i < result.length; ++i) {
            const encodedData = await this.encode(result[i]);
            await ws.writeSync(encodedData);
          }
        } while (result.length);
      }
      //clean up
      ws.end();
    } catch (err) {
      console.error("Export Error:" + err.message);
      ws.end();
      fs.unlink(this.fileName);
    }
    cursor.close(() => {
      client.release();
    });
    //return pipe to send to user
    return this.fileName;
  }
  jsonEncoder(record) {
    const encodedSchema = { meta: {}, data: {} };
    //loop through and assign meta data
    const metaKeys = Object.keys(this.metaSchema);
    for (let i = 0; i < metaKeys.length; ++i) {
      encodedSchema.meta[metaKeys[i]] = record[this.metaSchema[metaKeys[i]]];
    }
    //loop through data and assign data
    const dataKeys = Object.keys(this.dataSchema);
    for (let i = 0; i < dataKeys.length; ++i) {
      const idx = this.dataSchema[dataKeys[i]].indexOf(".");
      let val = this.dataSchema[dataKeys[i]];
      if (idx != -1) {
        val = this.dataSchema[dataKeys[i]].slice(idx + 1);
      }
      encodedSchema.data[dataKeys[i]] = record[val];
    }
    return JSON.stringify(encodedSchema);
  }
  async csvEncoder(record) {
    //calls json encoder to make the csv file have the same keys as the json file
    //its extra work but you will get more similar files
    let data = JSON.parse(this.jsonEncoder(record));
    //map the fields the csv parser needs
    const fields = [
      ...Object.keys(this.metaSchema).map((x) => {
        return "meta." + x;
      }),
      ...Object.keys(this.dataSchema).map((x) => {
        return "data." + x;
      }),
    ];
    //parse
    let csv = await parseAsync(
      data,
      { fields: fields, delimiter: this.delimiter, header: false },
      { highWaterMark: 8192 }
    );
    return csv + "\n";
  }
  //TODO compress
  compress() {}
}

class Rules {
  /**
   *
   * @param {number} id
   * @param {{}} rules
   */
  async create(ruleSetId, rules) {
    await pool.query(
      "INSERT INTO user_rules(rule_set_id, rules) VALUES($1,$2)",
      [ruleSetId, JSON.stringify(rules)]
    );
  }
  /**
   *
   * @param {number} id
   * @param {{}} rules
   */
  async update(id, rules) {
    await pool.query("UPDATE user_rules SET rules=$2 WHERE id=$1", [
      ruleId,
      JSON.stringify(rules),
    ]);
  }
  /**
   *
   * @param {number} id
   * @param {Array.<string>} columns
   */
  async read(id, columns = ["*"]) {
    const escapeSelectStart = 2;
    const selectStatement = columns.map((x, idx) => {
      return `$${idx + escapeSelectStart}`;
    });
    let result = await pool.query(
      `SELECT ${selectStatement} FROM user_rules WHERE id=$1`,
      [id, ...columns]
    );
    return result.rows;
  }
  /**
   *
   * @param {number} id
   */
  async delete(id) {
    await pool.query("DELETE FROM user_rules WHERE id=$1", [id]);
  }
}

class RuleSets {
  /**
   * @param {number} userId
   * @param {string} name
   * @param {string} color
   * @param {string} tableName
   */
  async create(userId, name, color, tableName) {
    const result = await pool.query(
      "INSERT INTO user_rule_sets(user_id, name, color, table_name) VALUES($1,$2,$3,$4) RETURNING id",
      [userId, name, color, tableName]
    );
    return result.rowCount;
  }
  async update(id, name, color) {
    const result = await pool.query(
      "UPDATE user_rule_sets SET name=$1, color=$2 WHERE id=$3",
      [id, name, color]
    );
    return result.rowCount;
  }
  /**
   * @param {string} tableName
   */
  async read(tableName) {
    let result = await pool.query(
      "SELECT * FROM user_rule_sets WHERE table_name=$1",
      [tableName]
    );
    return result.rows;
  }
  /**
   *
   * @param {number} id
   */
  async delete(id) {
    await pool.query("DELETE FROM user_rules WHERE rule_set_id=$1", [id]);
    await pool.query("DELETE FROM user_rule_sets WHERE id=$1", [id]);
  }
}

class UserTable {
  async create(
    email,
    userId,
    term,
    leftRange = 0,
    rightRange = 0,
    isPubmed = true
  ) {
    //create table name that uses the unique user id
    const prefixTableName = "user_temp_table_";
    const tableName = prefixTableName + userId;
    //check to see if the user table manager "table_map_temp" contains a table for the user
    const result = await pool.query(
      "SELECT table_type FROM table_map_temp WHERE table_owner=$1",
      [email]
    );

    if (result.rowCount) {
      //there are two type of user tables one that is for pubmed data another for erudit
      //if the table does not match the data the user wats delete it
      if (result.rows[0].table_type != isPubmed) {
        await this.delete(tableName);
      } else {
        await this.truncate(tableName);
        await pool.query(
          "UPDATE table_map_temp SET initial_search=ROW($1,$2,$3,$4) WHERE table_name=$5",
          [rule.term, rule.range[0], rule.range[1], 0, tableName]
        );
        return;
      }
    }

    if (isPubmed) {
      await pool.query(
        `CREATE TABLE ${tableName}(id int primary key, citation_location int[], num_ow int, num_os int, p_year int, rule_set_id int[])`
      );
      await pool.query(
        "INSERT INTO table_map_temp(table_name, creation_date, table_owner, table_type, initial_search) VALUES($1, $2, $3, $4, ($5,$6,$7, 0)::text_rule)",
        [tableName, new Date(), email, isPubmed, term, leftRange, rightRange]
      );
      return true;
    } else {
      await pool.query(
        `CREATE TABLE ${tableName}(id varchar(30) REFERENCES erudit_text(id) UNIQUE, citation_location int[], num_ow int, num_os int, p_year int, rule_set_id int[])`
      );
      await pool.query(
        "INSERT INTO table_map_temp(table_name,creation_date,table_owner, table_type, initial_search) VALUES($1, $2, $3, $4, ($5,$6,$7,0)::text_rule)",
        [tableName, new Date(), email, isPubmed, term, leftRange, rightRange]
      );
    }
  }
  async update(tableName, term, range = [0, 0]) {
    await pool.query(
      "UPDATE table_map_temp SET initial_search=ROW($1,$2,$3,$4) WHERE table_name=$5",
      [term, range[0], range[1], 0, tableName]
    );
  }
  /**
   * @param {string} tableName
   */
  async read(tableName) {
    const result = await pool.query(
      "SELECT * FROM table_map_temp WHERE table_name=$1",
      [tableName]
    );
    if (result.rowCount) {
      return result.rows[0];
    }
    return null;
  }
  /**
   * @param {string} tableName
   */
  async delete(tableName) {
    await pool.query(`DROP TABLE IF EXISTS ${tableName}`);
    await pool.query(`DELETE FROM table_map_temp WHERE table_name=$1`, [
      tableName,
    ]);
  }
  /**
   * @param {string} tableName
   */
  async truncate(tableName) {
    await pool.query(`TRUNCATE ${tableName}`);
  }
  /**
   *
   * @param {string} tableName
   * @param {Array.<number>} years
   */
  async overview(tableName, years) {
    let result = await pool.query(
      `SELECT p_year, SUM(array_length(citation_location,1)) FROM ${tableName} WHERE p_year=ANY($1::int[]) GROUP BY p_year`,
      [years]
    );
    return result.rows;
  }
  /**
   *
   * @param {string} tableName
   */
  async exists(tableName) {
    const result = await pool.query("SELECT to_regclass($1)", [tableName]);
    return result.rows[0].to_regclass;
  }
  /**
   *
   * @param {string} tableName
   */
  async isPubmed(tableName) {
    const result = await pool.query(
      "SELECT table_type FROM table_map_temp WHERE table_name =$1",
      [tableName]
    );
    return result.rows[0].table_type;
  }
}
//handles pubmed data layer
class Pubmed {
  constructor() {
    this.minYear = 2003;
    this.maxYear = 2020;
  }
  /**
   * @param {string} term
   * @param {Array.<number>} range
   */
  async search(tableName, term, range, session) {
    const userTable = new UserTable();
    try {
      let tableInfo = await userTable.read(tableName);
      if (!tableInfo) {
        await userTable.create(
          session.email,
          session.userId,
          term,
          range[0],
          range[1],
          true
        );
      } else {
        await userTable.truncate(tableName);
        await userTable.update(session.email, term, range);
      }
      let promises = [];
      for (let i = this.minYear; i <= this.maxYear; ++i) {
        promises.push(
          pool.query(
            `INSERT INTO ${tableName} SELECT * FROM get_matrix($1,$2,$3,$4)`,
            [term, range[0], range[1], `${i}`]
          )
        );
      }
      await progressAll(promises, session.socketId);
    } catch (e) {
      console.log(e);
    }
  }
  /**
   *
   * @param {string} tableName
   * @param {{}} bins
   * @param {Array.<int>} years
   * @param {Session} session
   */
  async getGridVisualization(tableName, bins, years) {
    const keys = Object.keys(bins);
    const binLength = keys.length;
    let tableResults = await pool.query(
      `SELECT ARRAY(SELECT floor(UNNEST(citation_location)::real / num_os::real * $1::real)::int) as cl, p_year as year FROM ${tableName}  WHERE p_year = ANY($2::int[])`,
      [binLength, years]
    );
    let result = {};
    const binKeys = Object.keys(JSON.parse(JSON.stringify(bins)));
    for (let i = 0; i < years.length; ++i) {
      result[years[i]] = {
        content: JSON.parse(JSON.stringify(bins)),
        max: 0,
        papers: { content: JSON.parse(JSON.stringify(bins)), max: 0 },
      };
    }
    for (let i = 0; i < tableResults.rows.length; ++i) {
      const row = tableResults.rows[i];
      const tempBin = JSON.parse(JSON.stringify(bins));
      for (let j = 0; j < row.cl.length; ++j) {
        result[row.year].content[row.cl[j]] += 1;
        tempBin[row.cl[j]] = 1;
      }
      for (const k of binKeys) {
        result[row.year].papers.content[k] += tempBin[k];
      }
    }
    for (let i = 0; i < years.length; ++i) {
      const year = years[i];
      result[year].max = Object.values(result[year].content).reduce(
        (a, b) => a + b,
        0
      );
      result[year].papers.max = Object.values(
        result[year].papers.content
      ).reduce((a, b) => a + b, 0);
    }
    return result;
  }
  /**
   *
   * @param {string} tableName
   * @param {number} rangeLeft
   * @param {number} rangeRight
   * @param {Array.<{start:number, year:number}>} bins
   */
  async getPapers(tableName, rangeLeft, rangeRight, bins, session) {
    let result = {};
    const selectedYears = bins.map((x) => {
      return x.year;
    });
    if (selectedYears.length == 1) {
      socketManager.send("progress", 50, session.socketId);
    }
    let promises = [];
    for (let i = 0; i < selectedYears.length; ++i) {
      if (typeof selectedYears[i] != "number") {
        throw new Error("Cannot get papers due to type error");
      }
      const pubmed = `pubmed_data_${selectedYears[i]}`;
      promises.push(
        pool.query(
          `SELECT citation_location, p_year as year, title, sentences, pm.id, num_os, rule_set_id FROM ${tableName} INNER JOIN ${pubmed} as pm ON ${tableName}.id = pm.id WHERE p_year = ANY($1::int[])`,
          [selectedYears]
        )
      );
    }
    let aggResult = await progressAll(promises, session.socketId);
    let tableResults = {};
    tableResults.rows = [].concat.apply(
      [],
      aggResult.map((x) => {
        return x.rows;
      })
    );
    tableResults.rowCount = tableResults.rows.length;
    //get rules
    let rules = await pool.query(
      `SELECT user_rule_sets.*, ARRAY(SELECT rules FROM user_rules WHERE rule_set_id=user_rule_sets.id) AS rules FROM user_rule_sets, (SELECT DISTINCT UNNEST(rule_set_id) AS ids FROM ${tableName} WHERE p_year=ANY($1::int[])) as rule_id WHERE id=rule_id.ids`,
      [selectedYears]
    );
    const ruleCheck = rules.rows.length;
    //used to convert the rule map
    let ruleMap = {};
    for (let i = 0; i < rules.rows.length; ++i) {
      ruleMap[rules.rows[i].id] = rules.rows[i];
    }
    //check if any results were returned, there should be results at this point
    if (!tableResults.rowCount) {
      return result;
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
      papers[row.id]["total"] = Object.values(content).reduce(
        (a, b) => a + b,
        0
      );
      globalMax = Math.max(globalMax, papers[row.id]["max"]);
      //generate the text for the vis
      for (let j = 0; j < unique_citation.length; ++j) {
        //make sure it does not go into the negative
        const leftIdx = Math.max(0, unique_citation[j] - rangeLeft);
        //make sure it does not index outside of the array
        const rightIdx = Math.min(
          row.sentences.length,
          unique_citation[j] + rangeRight + 1
        ); // +1 due to exclusion clause
        let text = row.sentences.slice(leftIdx, rightIdx);
        sentenceHits[row.id].push(text);
        if (ruleCheck) {
          ruleHits[row.id].push(
            citationRuleMap[unique_citation[j]].map((x) => {
              return ruleMap[x];
            })
          );
        } else {
          ruleHits[row.id].push([]);
        }
      }
    }
    result.papers = papers;
    result.ruleHits = ruleHits;
    result.sentenceHits = sentenceHits;
    result.years = selectedYears;
    result.max = globalMax;
    return result;
  }
  async getPaper(paperId, year) {
    if (typeof year != "number") {
      throw new Error("year not a number. Must be a number");
    }
    return await pool.query(
      `SELECT * FROM pubmed_data_${year} INNER JOIN pubmed_meta_${year} ON pubmed_data_${year}.id=pubmed_meta_${year}.id INNER JOIN pubmed_text_${year} ON pubmed_data_${year}.id=pubmed_text_${year}.id WHERE pubmed_data_${year}.id=$1`,
      [paperId]
    );
  }
  /**
   *
   * @param {string} select
   * @param {string} currentValue
   * @param {Array.<int>} ids
   */
  async getFilteredNames(filter, year, currentValue, ids, tableName) {
    if (typeof year != "number") {
      throw new Error(
        "Error: Pubmed.getFilteredNames year param requires to be number"
      );
    }
    const LIMIT = 5;
    const filters = {
      JOURNAL: "journal",
      TITLE: "title",
      AUTHORS: "meta.authors",
      AFFILIATION: "meta.affiliation",
    };
    let select = filters[filter];
    const selectStatements = {
      JOURNAL: "journal",
      TITLE: "title",
      AUTHORS: "authors",
      AFFILIATION: "affiliation",
    };
    const selectStatement = selectStatements[filter];
    const queryStatements = {
      JOURNAL: `SELECT DISTINCT ${select} FROM (SELECT * FROM ${tableName} WHERE id=ANY($3::int[])) AS utt INNER JOIN pubmed_meta_${year} as pubmed_meta ON utt.id=pubmed_meta.id WHERE ${select} ~* $1 LIMIT $2`,
      TITLE: `SELECT DISTINCT ${select} FROM (SELECT * FROM ${tableName} WHERE id=ANY($3::int[])) AS utt INNER JOIN pubmed_meta_${year} as pubmed_meta ON utt.id=pubmed_meta.id WHERE ${select} ~* $1 LIMIT $2`,
      AUTHORS: `SELECT ${select} FROM (SELECT UNNEST(pubmed_meta_${year}.authors) as authors FROM (SELECT * FROM ${tableName} WHERE id=ANY($3::int[])) as utt INNER JOIN pubmed_meta_${year} ON utt.id=pubmed_meta_${year}.id) as meta WHERE ${select} ~* $1 LIMIT $2`,
      AFFILIATION: `SELECT ${select} FROM (SELECT UNNEST(pubmed_meta_${year}.affiliation) as affiliation FROM (SELECT * FROM ${tableName} WHERE id=ANY($3::int[])) as utt INNER JOIN pubmed_meta_${year} ON utt.id=pubmed_meta_${year}.id) as meta WHERE ${select} ~* $1 LIMIT $2`,
    };
    let query = queryStatements[filter];
    const result = await pool.query(query, ["^" + currentValue, LIMIT, ids]);
    return result.rows.map((x) => {
      return x[selectStatement];
    });
  }
  /**
   *
   * @param {{}} fields
   * @param {string} tableName
   * @param {Array.<number>} ids
   * @param {number} year
   */
  async getFilteredIDs(fields, tableName, ids, year) {
    if (typeof year != "number") {
      throw new Error(
        "Error: Pubmed.getFilteredIDS param year requires to be number"
      );
    }
    let journals = [];
    let titles = [];
    let affiliations = [];
    let authors = [];
    fields.forEach((x) => {
      if ("journal" in x) {
        journals.push(x.journal);
      }
      if ("title" in x) {
        titles.push(x.title);
      }
      if ("affiliation" in x) {
        affiliations.push(x.affiliation);
      }
      if ("author" in x) {
        authors.push(x.author);
      }
    });
    const result = await pool.query(
      `SELECT utt.id FROM (SELECT * FROM ${tableName} WHERE id=ANY($1::int[])) as utt INNER JOIN pubmed_meta_${year} ON utt.id=pubmed_meta_${year}.id WHERE journal=ANY($2::text[]) OR title=ANY($3::text[]) OR authors && $4::text[] OR affiliation && $5::text[]`,
      [ids, journals, titles, authors, affiliations]
    );
    return result.rows.map((x) => x.id);
  }
  /**
   *
   * @param {string} tableName
   * @param {string} searchTerm
   */
  async getRuleWhereClause(tableName, searchTerm) {
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
    let column = "full_text_sentences";
    let whereClause = "";
    for (let i = 0; i < rules.rows.length; ++i) {
      const rule = rules.rows[i].rules;
      for (let j = 0; j < rule.length; ++j) {
        const operator = rule[j].operator != null ? rule[j].operator : "OR";
        whereClause += `${operator} ${column} @> jsonb_build_object('${rule[j].term}', array[]::int[]) `;
      }
    }
    //whereClause += `OR ${column} ? '${searchTerm}'`;
    //get rid of the initial OR
    return { where: whereClause.slice(2), rules: rules.rows };
  }
  /**
   *
   * @param {string} whereClause this should come from getRuleWhereClause
   */
  async getShortList(whereClause, year = null) {
    const result = await pool.query(
      `SELECT id FROM pubmed_text${
        !year ? "" : `_${year}`
      } WHERE ${whereClause}`
    );
    return result.rows.map((x) => x.id);
  }

  subRuleQuery(rule, ruleId, year, where) {
    const column = "full_text_sentences";
    let result = `SELECT pt.id, array_agg(ftc), pt.num_ow, pt.num_os, pt.year, array_agg(${ruleId}) FROM (SELECT ${column},pubmed_text_${year}.id as id, pubmed_text_${year}.citation_full_text_sentences, pubmed_meta_${year}.year as year, pubmed_data_${year}.num_of_words as num_ow, pubmed_data_${year}.num_of_sentences as num_os FROM pubmed_text_${year} INNER JOIN pubmed_data_${year} ON pubmed_text_${year}.id=pubmed_data_${year}.id INNER JOIN pubmed_meta_${year} ON pubmed_text_${year}.id=pubmed_meta_${year}.id WHERE ${where}) as pt, unnest(pt.citation_full_text_sentences) as ftc, `;
    //This is an example query left here to show the goal of this function.
    /*  "select pt.id, 'rule_name' from (select * from pubmed_text where id=any()) as pt, jsonb_array_elements(pt.full_text_words->'heart') as heart,jsonb_array_elements(pt.full_text_words->'cancer') as cancer, unnest(pt.citation_full_text_sentences) as ftc \
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
      } OR rule_${i}::int-ftc<=0 AND rule_${i}::int-ftc>=${-rule[i]
        .range[1]}) `;
    }
    //group by clause to group duplicates
    result += "GROUP BY pt.id, pt.year, pt.num_ow, pt.num_os ";
    return result;
  }
}
//erudit data layer
class Erudit {
  async search(term, tableName, session) {
    const userTable = new UserTable();
    let tableInfo = await userTable.read(tableName);
    if (!tableInfo) {
      await userTable.create(session.email, session.userId, term, 0, 0, false);
    } else {
      await userTable.truncate(tableName);
      await userTable.update(tableName, term);
    }
    const result = await pool.query(
      `INSERT INTO ${tableName} SELECT erudit_text.id, array(select jsonb_array_elements(erudit_text.sent_map->$1)::int), erudit_text.word_length, erudit_text.sent_length, erudit_meta.year, array_fill(-1, array[jsonb_array_length(erudit_text.sent_map->$1)]) FROM erudit_text INNER JOIN erudit_meta ON erudit_text.id = erudit_meta.id WHERE erudit_text.sent_map ? $1`,
      [term]
    );
    return result.row;
  }
  async searchEruditRules(tableName, ruleId, column = "sent_map") {
    const result = await pool.query(
      `INSERT INTO ${tableName} SELECT et.id, et.num_ow, et.num_os, array_agg(${ruleId}) FROM ()`
    );
  }
  /**
   *
   * @param {string} tableName
   * @param {{}} bins
   * @param {Array.<int>} years
   * @param {Session} session
   */
  async getGridVisualization(tableName, bins, years) {
    const keys = Object.keys(bins);
    const binLength = keys.length;
    let tableResults = await pool.query(
      `SELECT ARRAY(SELECT floor(UNNEST(citation_location)::real / num_os::real * $1::real)::int) as cl, p_year as year FROM ${tableName}  WHERE p_year = ANY($2::int[])`,
      [binLength, years]
    );
    let result = {};
    const binKeys = Object.keys(JSON.parse(JSON.stringify(bins)));
    for (let i = 0; i < years.length; ++i) {
      result[years[i]] = {
        content: JSON.parse(JSON.stringify(bins)),
        max: 0,
        papers: { content: JSON.parse(JSON.stringify(bins)), max: 0 },
      };
    }
    for (let i = 0; i < tableResults.rows.length; ++i) {
      const row = tableResults.rows[i];
      const tempBin = JSON.parse(JSON.stringify(bins));
      for (let j = 0; j < row.cl.length; ++j) {
        result[row.year].content[row.cl[j]] += 1;
        tempBin[row.cl[j]] = 1;
      }
      for (const k of binKeys) {
        result[row.year].papers.content[k] += tempBin[k];
      }
    }
    for (let i = 0; i < years.length; ++i) {
      const year = years[i];
      result[year].max = Object.values(result[year].content).reduce(
        (a, b) => a + b,
        0
      );
      result[year].papers.max = Object.values(
        result[year].papers.content
      ).reduce((a, b) => a + b, 0);
    }
    return result;
  }
  async getPapers(tableName, bins) {
    let result = {};
    let tableResults = await pool.query(
      `SELECT citation_location, p_year as year, sentences, utt.id, num_os, rule_set_id FROM ${tableName} AS utt INNER JOIN erudit_data ON utt.id=erudit_data.id WHERE p_year = ANY($1::int[])`,
      [
        bins.map((x) => {
          return x.year;
        }),
      ]
    );
    //get rules
    let rules = await pool.query(
      `SELECT user_rule_sets.*, ARRAY(SELECT rules FROM user_rules WHERE rule_set_id=user_rule_sets.id) AS rules FROM user_rule_sets, (SELECT DISTINCT UNNEST(rule_set_id) AS ids FROM ${tableName} WHERE p_year=ANY($1::int[])) as rule_id WHERE id=rule_id.ids`,
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
    const ruleCheck = rules.rows.length;
    //check if any results were returned, there should be results at this point
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
      papers[row.id]["total"] = Object.values(content).reduce(
        (a, b) => a + b,
        0
      );
      globalMax = Math.max(globalMax, papers[row.id]["max"]);
      //generate the text for the vis
      for (let j = 0; j < unique_citation.length; ++j) {
        //make sure it does not go into the negative
        const leftIdx = Math.max(0, unique_citation[j] - 0);
        //make sure it does not index outside of the array
        const rightIdx = Math.min(
          row.sentences.length,
          unique_citation[j] + 0 + 1
        ); // +1 due to exclusion clause
        let text = row.sentences.slice(leftIdx, rightIdx);
        sentenceHits[row.id].push(text);
        if (ruleCheck) {
          ruleHits[row.id].push(
            citationRuleMap[unique_citation[j]].map((x) => {
              return ruleMap[x];
            })
          );
        } else {
          ruleHits[row.id].push([]);
        }
      }
    }
    result.papers = papers;
    result.ruleHits = ruleHits;
    result.sentenceHits = sentenceHits;
    result.years = bins.map((x) => {
      return x.year;
    });
    result.max = globalMax;
    return result;
  }
  /**
   *
   * @param {string} paperId
   */
  async getPaper(paperId) {
    return await pool.query(
      "SELECT * FROM erudit_meta WHERE erudit_meta.id=$1",
      [paperId]
    );
  }
  /**
   *
   * @param {string} select
   * @param {string} currentValue
   * @param {Array.<int>} ids
   */
  async getFilteredNames(filter, currentValue, ids, tableName) {
    const LIMIT = 5;
    const filters = {
      JOURNAL: "journal",
      TITLE: "title",
      AUTHORS: "meta.authors",
      AFFILIATION: "meta.affiliation",
    };
    let select = filters[filter];
    const selectStatements = {
      JOURNAL: "journal",
      TITLE: "title",
      AUTHORS: "authors",
      AFFILIATION: "affiliation",
    };
    const selectStatement = selectStatements[filter];
    const QUERY_OPTIONS = {
      JOURNAL: `SELECT DISTINCT ${select} FROM (SELECT * FROM ${tableName} WHERE id=ANY($3)) AS utt INNER JOIN erudit_meta ON utt.id=erudit_meta.id WHERE ${select} ~* $1 LIMIT $2`,
      AUTHORS: `SELECT ${select} FROM (SELECT UNNEST(erudit_meta.authors) as authors FROM (SELECT * FROM ${tableName} WHERE id=ANY($3)) as utt INNER JOIN erudit_meta ON utt.id=erudit_meta.id) as meta WHERE ${select} ~* $1 LIMIT $2`,
      AFFILIATION: `SELECT ${select} FROM (SELECT UNNEST(erudit_meta.affiliation) as affiliation FROM (SELECT * FROM ${tableName} WHERE id=ANY($3)) as utt INNER JOIN erudit_meta ON utt.id=erudit_meta.id) as meta WHERE ${select} ~* $1 LIMIT $2`,
    };
    let query = QUERY_OPTIONS[filter];
    const result = await pool.query(query, ["^" + currentValue, LIMIT, ids]);
    return result.rows.map((x) => {
      return x[selectStatement];
    });
  }
  /**
   *
   * @param {{}} fields
   * @param {string} tableName
   * @param {Array.<number>} ids
   */
  async getFilteredIDs(fields, tableName, ids) {
    let journals = [];
    let titles = [];
    let affiliations = [];
    let authors = [];
    fields.forEach((x) => {
      if ("journal" in x) {
        journals.push(x.journal);
      }
      if ("title" in x) {
        titles.push(x.title);
      }
      if ("affiliation" in x) {
        affiliations.push(x.affiliation);
      }
      if ("author" in x) {
        authors.push(x.author);
      }
    });
    const result = await pool.query(
      `SELECT utt.id FROM (SELECT * FROM ${tableName} WHERE id=ANY($1)) as utt INNER JOIN erudit_meta ON utt.id=erudit_meta.id WHERE journal=ANY($2::text[]) OR authors && $3::text[] OR affiliation && $4::text[]`,
      [ids, journals, authors, affiliations]
    );
    return result.rows.map((x) => {
      return x.id;
    });
  }
  /**
   *
   * @param {string} tableName
   * @param {string} searchTerm
   */
  async getRuleWhereClause(tableName, searchTerm) {
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
    let column = "sent_map";
    let whereClause = "";
    for (let i = 0; i < rules.rows.length; ++i) {
      const rule = rules.rows[i].rules;
      for (let j = 0; j < rule.length; ++j) {
        const operator = rule[j].operator != null ? rule[j].operator : "OR";
        whereClause += `${operator} (${column} ? '${rule[j].term}' AND ${column} ? '${rule[0].term}') `;
      }
    }
    whereClause += `OR ${column} ? '${searchTerm}'`;
    //get rid of the initial OR
    return { where: whereClause.slice(2), rules: rules.rows };
  }
  /**
   *
   * @param {string} whereClause this should come from getRuleWhereClause
   */
  async getShortList(whereClause) {
    const result = await pool.query(
      `SELECT id FROM erudit_text WHERE ${whereClause}`
    );
    return result.rows.map((x) => x.id);
  }
  /**
   *
   * @param {Array.<{range:Array.<number>, operator:string, term:string}>} rule
   * @param {number} ruleId
   */
  subRuleQuery(rule, ruleId) {
    let result = `SELECT pt.id, array_agg(rule_0::int), pt.num_ow, pt.num_os, pt.year, array_agg(${ruleId}) FROM (SELECT sent_map, erudit_text.id as id, erudit_meta.year as year, erudit_text.word_length as num_ow, erudit_text.sent_length as num_os FROM erudit_text INNER JOIN erudit_meta ON erudit_text.id=erudit_meta.id WHERE erudit_text.id=ANY($1)) as pt, `;
    //This is an example query left here to show the goal of this function.
    /*  "select pt.id, 'rule_name' from (select * from pubmed_text where id=any()) as pt, jsonb_array_elements(pt.full_text_words->'heart') as heart,jsonb_array_elements(pt.full_text_words->'cancer') as cancer, unnest(pt.citation_full_text_sentences) as ftc \
    where (heart::int-ftc>=0 and heart::int-ftc<=0 or heart::int-ftc<=0 and heart::int-ftc>=0) AND cancer::int-ftc>=0 and cancer::int-ftc<=0 or cancer::int-ftc<=0 and cancer::int-ftc>=0;";
    */
    for (let i = 0; i < rule.length; ++i) {
      result += `jsonb_array_elements(pt.sent_map->'${rule[i].term}') as rule_${i},`;
    }
    //remove end comma
    result = result.slice(0, -1);
    result += " WHERE ";

    //create where clause
    for (let i = 1; i < rule.length; ++i) {
      result += `${
        rule[i].operator == undefined || i == 1 ? "(" : rule[i].operator + " ("
      } rule_${i}::int-rule_0::int>=0 AND rule_${i}::int-rule_0::int<=${
        rule[i].range[0]
      } OR rule_${i}::int-rule_0::int<=0 AND rule_${i}::int-rule_0::int>=${-rule[
        i
      ].range[1]}) `;
    }
    //whereClause += `OR sent_map ? '${searchTerm}'`;

    //group by clause to group duplicates
    result += "GROUP BY pt.id, pt.year, pt.num_ow, pt.num_os ";
    return result;
  }
}

//overall data layer. Should use this to add any new functionality to the data layer.
class DataLayer {
  constructor() {
    this.rules = new Rules();
    this.ruleSets = new RuleSets();
    this.userTable = new UserTable();
    this.pubmed = new Pubmed();
    this.erudit = new Erudit();
  }
}

class Snapshot {
  async submit() {}
}
module.exports = { DataExport, DataLayer, progressAll };
