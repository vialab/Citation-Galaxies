const pool = require("./database");
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const email = require("./email");

const saltRounds = 10;
const HTTP_CODES = {
  SUCCESS: 200,
  INVALID_DATA_TYPE: 400,
  INVALID_VALUES: 422,
};

/**
 * @param {Request} req
 */
const saveSession = async (req) => {
  return new Promise((res, rej) => {
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return rej(err);
      }
      res(true);
    });
  });
};
/**
 *
 * @param {JSON} expectedKeys
 * @param {Request} req
 */
const reqValid = (expectedKeys, req) => {
  const keys = Object.keys(expectedKeys);
  const body = req.body;
  for (const idx in keys) {
    if (!keys[idx] in body) {
      return null;
    }
    expectedKeys[keys[idx]] = body[keys[idx]];
  }
  return expectedKeys;
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const createUser = async (req, res) => {
  const requiredInfo = { email: "", password: "" };
  let sentInfo = reqValid(requiredInfo, req);
  //check input
  if (!sentInfo) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("Invalid Input");
    return;
  }
  values = [sentInfo.email];
  //check if user exists
  const userRow = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    values
  );
  if (userRow.rowCount) {
    res.status(HTTP_CODES.INVALID_VALUES).send("account exists");
    return;
  }
  //check if user exists but they have not verified
  const UserUnverifiedRow = await pool.query(
    "SELECT * FROM users_unverified WHERE email=$1",
    values
  );
  if (UserUnverifiedRow.rowCount) {
    res
      .status(HTTP_CODES.INVALID_DATA_TYPE)
      .send(
        "account exists, please verify your email by clicking the link in the email we sent you."
      );
    return;
  }
  let hashKey = crypto.randomBytes(60).toString("hex");
  const existingKeys = await pool.query(
    "SELECT hash_key FROM users_unverified"
  );
  const key_map = {};
  if (existingKeys.rowCount) {
    for (let i = 0; i < existingKeys.rows.length; ++i) {
      key_map[existingKeys[i].hash_key] = 0;
    }
  }
  do {
    hashKey = crypto.randomBytes(60).toString("hex");
  } while (hashKey in key_map);
  //salt password
  bcrypt.hash(sentInfo.password, saltRounds).then(function (result) {
    console.log(result.length);
    console.log(hashKey.length);
    pool.query(
      "INSERT INTO users_unverified(email, password, hash_key, expiration) VALUES($1, $2, $3, $4)",
      [sentInfo.email, result, hashKey, new Date()]
    );
  });
  email.sendMail(
    {
      to: sentInfo.email,
      subject: "Account Creation",
      text:
        process.env.BASE_URL +
        "/user/verify?hash_key=" +
        hashKey +
        "&email=" +
        sentInfo.email,
    },
    (err, info) => {
      if (err) {
        console.error(err);
        res
          .status(HTTP_CODES.INVALID_VALUES)
          .send("Error sending email to the supplied account.");
        return;
      }
      res
        .status(HTTP_CODES.SUCCESS)
        .send("Please check your email for verification link.");
      console.log(info);
    }
  );
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const deleteUser = async (req, res) => {
  const tableTypes = { key: 0, email: 1, password: 2 };
  const requiredInfo = { email: "", password: "" };
  //validate info
  let sentInfo = reqValid(requiredInfo, req);
  if (sentInfo == null) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("Invalid Input");
    return;
  }
  //authenticate user
  const { row } = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    sentInfo.email
  );
  const match = await bcrypt.compare(
    sentInfo.password,
    row[tableTypes.password]
  );
  if (match) {
    //if authenticated user, delete user
    pool.query("DELETE FROM users WHERE email=$1", [sentInfo.email]);
    res.status(HTTP_CODES.SUCCESS).send("deleted");
  } else {
    res.status(HTTP_CODES.INVALID_VALUES).send("invalid credentials");
  }
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const authUser = async (req, res) => {
  const requiredInfo = { email: "", password: "" };
  let sentInfo = reqValid(requiredInfo, req);
  if (sentInfo == null) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("Invalid Input");
    return;
  }
  const values = [sentInfo.email];
  const result = await pool.query("SELECT * FROM users WHERE email=$1", values);
  if (!result.rowCount) {
    res.status(HTTP_CODES.INVALID_VALUES).send("email does not exist");
    return;
  }
  const match = await bcrypt.compare(
    sentInfo.password,
    result.rows[0].password
  );

  if (match) {
    req.session.email = sentInfo.email;
    req.session.userId = result.rows[0].id;
    req.session.tableName = "user_temp_table_" + req.session.userId;
    req.session.loginTime = Date.now();
    req.session.save((err) => {
      if (!err) {
        console.log(req.session);
        return res.redirect("/dashboard");
      }
    });

    return;
  }

  res.status(HTTP_CODES.INVALID_VALUES).redirect("/");
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const verifyUser = async (req, res) => {
  const urlParams = new URLSearchParams(req.query);
  if (!(urlParams.has("hash_key") && urlParams.has("email"))) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("Invalid Input");
    return;
  }
  //check if email and hash_key exist
  const values = [urlParams.get("email"), urlParams.get("hash_key")];
  const matched = await pool.query(
    "SELECT * FROM users_unverified WHERE email=$1 AND hash_key=$2",
    values
  );
  if (!matched.rowCount) {
    res.status(HTTP_CODES.INVALID_VALUES).send("Invalid Input");
    return;
  }
  //delete user from unverified table
  pool.query(
    "DELETE FROM users_unverified WHERE email=$1 AND hash_key=$2",
    values
  );
  //insert user into users table
  pool.query("INSERT INTO users(email,password) VALUES($1, $2)", [
    matched.rows[0].email,
    matched.rows[0].password,
  ]);
  //now a verified user
  res.status(HTTP_CODES.SUCCESS).send("Account verified");
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
const recoverUser = async (req, res) => {
  const requiredInfo = { email: "" };
  let sentInfo = reqValid(requiredInfo, req);
  if (sentInfo == null) {
    res.status(HTTP_CODES.INVALID_DATA_TYPE).send("Invalid Input");
    return;
  }
  let result = await pool.query("SELECT * FROM users WHERE email=$1", [
    sentInfo.email,
  ]);
  //email exists
  if (result.rowCount) {
    let passwordRecovery = crypto.randomBytes(15).toString("hex");
    //send new password
    email.sendMail(
      {
        to: sentInfo.email,
        subject: "Account Recovery",
        text: "New Password: " + passwordRecovery,
      },
      (err, info) => {
        if (err) {
          console.error(err);
          return;
        }
      }
    );
    bcrypt.hash(passwordRecovery, saltRounds).then(function (result) {
      pool.query("UPDATE users SET password=$1 WHERE email=$2", [
        result,
        sentInfo.email,
      ]);
    });
    return;
  }
  result = await pool.query("SELECT * FROM users_unverified WHERE email=$1", [
    sentInfo.email,
  ]);
  if (!result.rowCount) {
    res.status(HTTP_CODES.INVALID_VALUES).send("Invalid Input");
    return;
  } else {
    let passwordRecovery = crypto.randomBytes(15).toString("hex");
    //send new password
    email.sendMail(
      {
        to: sentInfo.email,
        subject: "Account Recovery",
        text: "New Password: " + passwordRecovery,
      },
      (err, info) => {
        if (err) {
          console.error(err);
          return;
        }
      }
    );
    bcrypt.hash(passwordRecovery, saltRounds).then(function (result) {
      pool.query("UPDATE users_unverified SET password=$1 WHERE email=$2", [
        result,
        sentInfo.email,
      ]);
    });
    res.status(HTTP_CODES.SUCCESS);
    return;
  }
};

module.exports = {
  createUser,
  deleteUser,
  authUser,
  verifyUser,
  recoverUser,
};
