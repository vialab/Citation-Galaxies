const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DB_AUTH_STRING,
});

module.exports = pool;
