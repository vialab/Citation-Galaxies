const scheduleTask = require("./scheduler");
const pool = require("./database");

/**
 * checks users_unverified table for entries that expired
 * current alloted time for users to verify email is 3 days
 */
const checkExpiredUsers = async () => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  pool.query("DELETE FROM users_unverified WHERE expiration < $1", [
    threeDaysAgo,
  ]);
};

scheduleTask("0 23 * * *", checkExpiredUsers);
