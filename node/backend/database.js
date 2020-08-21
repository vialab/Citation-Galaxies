const { Pool } = require("pg");
//node-pg connection
const pool = new Pool({
  connectionString: process.env.DB_AUTH_STRING,
});
//singleton export
module.exports = pool;
