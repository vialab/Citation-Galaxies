var fs = require("fs")
var dbschema = JSON.parse(fs.readFileSync("dbschema.json"));
const dbquery = {
  signal: {
    query: "select id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal \
      where enabled and cookieid=:cookieid;"
    , require_cookie: true
    , aliases: {
      "signalcategoryid": {
        query: "signalcategory"
        , col: "catname"
        , name: "category"
      }
      , "signaltypeid": {
        query: "signaltype"
        , col: "name"
        , name: "type"
      }
    }
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
    , aliases: {
      "signalcategoryid": {
        query: "signalcategory"
        , col: "catname"
        , name: "category"
      }
      , "signaltypeid": {
        query: "signaltype"
        , col: "name"
        , name: "type"
      }
    }
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
  , signalbytype: {
    query: "select id, signalcategoryid, signal, score, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=:signaltypeid and cookieid=:cookieid;"
    , require_cookie: true
    , aliases: {
      "signalcategoryid": {
        query: "signalcategory"
        , col: "catname"
        , name: "category"
      }
      , "signaltypeid": {
        query: "signaltype"
        , col: "name"
        , name: "type"
      }
    }
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
  , filter: {
    query: "select id, signalcategoryid, signal, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=2 and parentid=:parentid and cookieid=:cookieid"
    , require_cookie: true
    , aliases: {
      "signalcategoryid": {
        query: "signalcategory"
        , col: "catname"
        , name: "category"
      }
      , "signaltypeid": {
        query: "signaltype"
        , col: "name"
        , name: "type"
      }
    }
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
    , parent: "parentid"
  }
  , restriction: {
    query: "select id, signalcategoryid, signal, distance, parentid, signaltypeid from signal \
      where enabled and signaltypeid=3 and parentid=:parentid and cookieid=:cookieid"
    , require_cookie: true
    , aliases: {
      "signalcategoryid": {
        query: "signalcategory"
        , col: "catname"
        , name: "category"
      }
      , "signaltypeid": {
        query: "signaltype"
        , col: "name"
        , name: "type"
      }
    }
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
    , parent: "parentid"
  }
  , signalcategory: {
    query: "select id, catname, score, color from signalcategory where enabled\
      and cookieid=:cookieid;"
    , require_cookie: true
    , aliases: {}
    , links: {
      "signals": {
        "params": {"id":"signalcategoryid"}
        , "query": "signalbycategory"
      }
    }
    , origin: "signalcategory"
  }
  , signaltype: {
    query: "select id, name, type from signaltype"
    , aliases: {}
    , require_cookie: false
    , origin: "signaltype"
  }
  , insert_signal: {
    query: "insert into signal(signal, score, signalcategoryid, enabled, cookieid, signaltypeid, parentid) \
      values(:signal, :score, :signalcategoryid, true, :cookieid, :signaltypeid, :parentid)"
    , require_cookie: true
  }
  , update_signal: {
    query: "update signal set signal=:signal, score=:score, \
      signalcategoryid=:signalcategoryid, enabled=:enabled, cookieid=:cookieid, \
      signaltypeid=:signaltypeid where id=:id and cookieid=:cookieid"
    , require_cookie: true
    , aliases: {}
  }
  , delete_signal: {
    query: "delete from signal where id=:id and cookieid=:cookieid"
    , require_cookie: true
    , aliases: {}
  }
  , insert_signalcategory: {
    query: "insert into signalcategory(catname, score, color, enabled, cookieid) \
      values(:catname, :score, :color, true, :cookieid)"
    , require_cookie: true
    , aliases: {}
  }
  , update_signalcategory: {
    query: "update signalcategory set catname=:catname, score=:score, \
      color=:color where id=:id and cookieid=:cookieid"
    , require_cookie: true
    , aliases: {}
  }
  , delete_signalcategory: {
    query: "delete from signalcategory where id=:id and cookieid=:cookieid"
    , require_cookie: true
    , aliases: {}
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
