const fs = require("fs");
const pool = require("./database");
const Cursor = require("pg-cursor");
const { promisify } = require("util");
Cursor.prototype.readAsync = promisify(Cursor.prototype.read);

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
    ruleSets = {}
  ) {
    this.metaSchema = {
      title: "title",
      journal: "journal",
      authors: "authors",
      affiliations: "affiliation",
      year: "year",
      "pubmed id": "id",
    };
    this.dataSchema = {
      "abstract sentences": "abstract_sentences",
      "abstract words": "abstract_sentences",
      sentences: "sentences",
      words: "words",
      "raw abstract": "full_abstract",
      "raw text": "full_text",
    };
    this.tableName = userTableName;
    this.suppliedMeta = meta;
    this.suppliedRuleSets = ruleSets;
    this.suppliedDataOptions = dataOptions;
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
  buildSelection(schema) {
    let keys = Object.keys(schema);
    if (keys.length) {
      return "";
    }
    let selection = "";
    for (let i = 0; i < keys.length; ++i) {
      selection += schema[keys[i]] + ", ";
    }
    return selection;
  }
  async export(batchSize = 100) {
    //create client for this we need to use the pg cursor to stream rather than load everything into memory
    const client = await pool.connect();
    //use cursor
    const cursor = client.query(
      new Cursor(
        `SELECT ${this.buildSelection(this.dataSchema)}${this.buildSelection(
          this.metaSchema
        )} FROM ${this.tableName} INNER JOIN pubmed_data ON ${
          this.tableName
        }.id=pubmed_data.id INNER JOIN pubmed_meta ON ${
          this.tableName
        }.id=pubmed_meta.id WHERE rule_set_id && $1::int[]`,
        [this.suppliedRuleSets]
      )
    );
    const ws = fs.createWriteStream(this.fileName);
    //manually writing each object into a json array
    //as far as I am aware streaming a json array to file is not a thing
    ws.write("[");
    //read until end
    do {
      //read the batchsize of rows
      let result = await cursor.readAsync(batchSize);
      //write to file
      for (let i = 0; i < result.rowCount; ++i) {
        const encodedData = this.encode(result.rows[i]);
        ws.write(encodedData + ",");
      }
    } while (result.rowCount);
    ws.write("]");
    //clean up
    ws.end();
    cursor.close(() => {
      client.release();
    });
    //return pipe to send to user
    //TODO delete file after pipe
    return this.fileName;
  }
  jsonEncoder(record) {
    const encodedSchema = { meta: this.metaSchema, data: this.dataSchema };
    //loop through and assign meta data
    const metaKeys = Object.keys(encodedSchema.meta);
    for (let i = 0; i < metaKeys.length; ++i) {
      encodedSchema.meta[metaKeys[i]] = record[this.metaSchema[metaKeys[i]]];
    }
    //loop through data and assign data
    const dataKeys = Object.keys(encodedSchema.data);
    for (let i = 0; i < dataKeys; ++i) {
      encodedSchema.data[dataKeys[i]] = record[this.dataSchema[dataKeys[i]]];
    }
    return JSON.stringify(encodedSchema);
  }
  csvEncoder(record) {}
  //TODO compress
  compress() {}
}

module.exports = Data;
