const fs = require("fs");
const pool = require("./database");
const Cursor = require("pg-cursor");
const { promisify } = require("util");
const { parseAsync } = require("json2csv");

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

class Data {
  /**
   *
   * @param {boolean} isJSON
   * @param {{}} meta
   * @param {Array.<Number>} ruleSets
   */
  constructor(
    isJSON,
    userTableName,
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
      sentences: "pubmed_data.sentences",
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
  async export(batchSize = 100) {
    //create client for this we need to use the pg cursor to stream rather than load everything into memory
    //select max(urr->'range'->>0) as left, max(urr->'range'->>1) as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id;
    //select res from (select cl-rinfo.left, cl+rinfo.right, utt3.id from pubmed_data,user_temp_table_3 as utt3,unnest(utt3.citation_location) as cl, unnest(utt3.rule_set_id) as rsd, (select max(urr->'range'->>0)::int as left, max(urr->'range'->>1)::int as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id) as rinfo where rsd=rinfo.rule_set_id) as res
    //select pubmed_data.sentences[(select greatest(res.l,0)):(select least(res.r, array_length(pubmed_data.sentences,1)))] from pubmed_data, (select cl-rinfo.left as l, cl+rinfo.right as r, utt3.id as id from pubmed_data,user_temp_table_3 as utt3,unnest(utt3.citation_location) as cl, unnest(utt3.rule_set_id) as rsd, (select max(urr->'range'->>0)::int as left, max(urr->'range'->>1)::int as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id) as rinfo where rsd=rinfo.rule_set_id) as res where pubmed_data.id=res.id;
    const client = await pool.connect();
    const queryString = `SELECT ${this.buildSelection(
      this.dataSchema
    )}${this.buildSelection(this.metaSchema, "pubmed_meta").slice(
      0,
      -2
    )} FROM ${
      this.tableName
    } INNER JOIN (select array_agg((cl-rinfo.left, cl+rinfo.right)) as idx, utt3.id from ${
      this.tableName
    } as utt3 cross join unnest(utt3.citation_location) as cl cross join unnest(utt3.rule_set_id) as rsd cross join (select max(urr->'range'->>0)::int as left, max(urr->'range'->>1)::int as right, user_rules.rule_set_id from user_rules, jsonb_array_elements(user_rules.rules) as urr group by user_rules.rule_set_id) as rinfo where rsd=rinfo.rule_set_id group by utt3.id) as snippets ON ${
      this.tableName
    }.id=snippets.id INNER JOIN pubmed_data ON ${
      this.tableName
    }.id=pubmed_data.id INNER JOIN pubmed_meta ON ${
      this.tableName
    }.id=pubmed_meta.id WHERE rule_set_id && $1::int[]`;
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

module.exports = Data;
