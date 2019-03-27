var fs = require("fs")
var dbschema = JSON.parse(fs.readFileSync("dbschema.json"));
const dbquery = {
  signal: {
    query: "select id, signalcategoryid, signal, score from signal \
      where enabled and cookieid=:cookieid;"
    , require_cookie: true
  }
  , signalcategory: {
    query: "select id, catname, score, color from signalcategory where enabled\
      and cookieid=:cookieid;"
    , require_cookie: true
  }
  , signaltype: {
    query: "select * from signaltype"
    , require_cookie: false
  }
};

module.exports = {
  hasTable: hasTable
  , hasColumn: hasColumn
  , schema: dbschema
  , query: dbquery
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


/*******************************************************************************
 * CODE BELOW IS WHAT I USED TO EXTRACT DB SCHEMA SAVED IN `dbschema.json`
 ******************************************************************************/
function getSchema() {
  pool.connect((err, client, done) => {

    getSchema(client).then(results => {
      done();
      dbschema = results;
      console.log(dbschema);
    });
  });
}

// get database schema
async function getSchema(client) {
  let dbschema = {};
  let tables = await client.query(`SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname='public';`);

  for(let i=0; i<tables.rowCount; i++) {
    row = tables.rows[i];
    dbschema[row.tablename] = [];
    let cols = await client.query(`SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1;`, [row.tablename]);
    cols.rows.forEach(col => {
      dbschema[row.tablename].push(col.column_name);
    })
  }

  return dbschema;
}
