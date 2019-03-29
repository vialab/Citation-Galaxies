var fs = require("fs")
var dbschema = JSON.parse(fs.readFileSync("dbschema.json"));
const dbquery = {
  signal: {
    query: "select id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal \
      where enabled and cookieid=:cookieid;"
    , require_cookie: true
    , links: { // to be used to connect to other queries
        "filters": {
          "params":{"id":"parentid"} // potential parameters to pass into next query
          , "query": "filter" // name of another query
        }
        , "restrictions": {
          "params":{"id":"parentid"}
          , "query": "restriction"
        }
      }
    , actions: { // to be used to perform specific javascript functions
      "similar": "findSimilar" // let's let javascript handle getting the params
    }
    , origin: "signal"
  }
  , signalbycategory: {
    query: "select id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=1 and signalcategoryid=:signalcategoryid and cookieid=:cookieid;"
    , require_cookie: true
    , links: { // to be used for more interactive/heirarchical tables
        "filters": {
          "params":{"id":"parentid"} // potential parameters to pass into next query
          , "query": "filter" // name of another query
        }
        , "restrictions": {
          "params":{"id":"parentid"}
          , "query": "restriction"
        }
      }
    , origin: "signal"
  }
  , signalbytype: {
    query: "select id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=:signaltypeid and cookieid=:cookieid;"
    , require_cookie: true
    , links: { // to be used for more interactive/heirarchical tables
        "filters": { // name of the link
          "params":{"id":"parentid"} // potential parameters to pass into next query
          , "query": "filter" // name of another query
        }
        , "restrictions": {
          "params":{"id":"parentid"}
          , "query": "restriction"
        }
      }
    , origin: "signal"
  }
  , filter: {
    query: "select id, signalcategoryid, signal, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=2 and parentid=:parentid and cookieid=:cookieid"
    , require_cookie: true
    , origin: "signal"
  }
  , restriction: {
    query: "select id, signalcategoryid, signal, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=3 and parentid=:parentid and cookieid=:cookieid"
    , require_cookie: true
    , origin: "signal"
  }
  , signalcategory: {
    query: "select id, catname, score, color from signalcategory where enabled\
      and cookieid=:cookieid;"
    , require_cookie: true
    , links: {
      "signals": {
        "params": {"id":"signalcategoryid"}
        , "query": "signalbycategory"
      }
    }
    , origin: "signalcategory"
  }
  , signaltype: {
    query: "select * from signaltype"
    , require_cookie: false
    , origin: "signaltype"
  }
};

module.exports = {
  hasTable: hasTable
  , hasColumn: hasColumn
  , schema: dbschema
  , api: dbquery
};

// does our database have this table?
function hasTable(table) {
  if(dbschema[table]) return true;
  else return false;
}

// does a table that exists in our db have this column?
function hasColumn(table, column) {
  if(!dbschema[table]) throw "Table does not exist in schema!";
  if(dbschema[table].indexOf(column) >= 0) return true;
  else return false;
}

//
// /*******************************************************************************
//  * CODE BELOW IS WHAT I USED TO EXTRACT DB SCHEMA SAVED IN `dbschema.json`
//  ******************************************************************************/
//  app.get('/dbschema', function(req, res, next) {
//   pool.connect((err, client, done) => {
//
//     getSchema(client).then(results => {
//       done();
//       dbschema = results;
//       fs.writeFileSync("dbschema.json", JSON.stringify(dbschema))
//     });
//   });
// });
//
// // get database schema
// async function getSchema(client) {
//   let dbschema = {};
//   let tables = await client.query(`SELECT tablename
//     FROM pg_catalog.pg_tables
//     WHERE schemaname='public';`);
//
//   for(let i=0; i<tables.rowCount; i++) {
//     row = tables.rows[i];
//     dbschema[row.tablename] = {};
//     let cols = await client.query(`SELECT column_name, data_type
//       FROM information_schema.columns
//       WHERE table_name = $1;`, [row.tablename]);
//     cols.rows.forEach(col => {
//       dbschema[row.tablename][col.column_name] = col.data_type;
//     })
//   }
//
//   return dbschema;
// }
