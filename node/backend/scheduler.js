const scheduler = require("node-schedule");
//use this when you need to schedule a task
/**
 * @param {string} cronJob - ******
 * *    *    *    *    *    *
 *┬    ┬    ┬    ┬    ┬    ┬
 *│    │    │    │    │    │
 *│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
 *│    │    │    │    └───── month (1 - 12)
 *│    │    │    └────────── day of month (1 - 31)
 *│    │    └─────────────── hour (0 - 23)
 *│    └──────────────────── minute (0 - 59)
 *└───────────────────────── second (0 - 59, OPTIONAL)
 * @param {function()} func
 */
const scheduleTask = (cronJob, func) => {
  scheduler.scheduleJob(cronJob, func);
};

module.exports = scheduleTask;
