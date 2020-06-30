Object.prototype.deepKeys = function (obj) {
  let keys = [];
  for (let key in obj) {
    keys.push(key);
    if (typeof obj[key] === "object") {
      let subkeys = Object.deepKeys(obj[key]);
      keys = keys.concat(
        subkeys.map(function (subkey) {
          return key + "." + subkey;
        })
      );
    }
  }
  return keys;
};
/**
 *
 * @param {{}} required
 * @param {{}} input
 * @returns {boolean}
 */
function validateJSON(required, input) {
  let keysToCheck = Object.deepKeys(required);
  for (let i = 0; i < keysToCheck.length; ++i) {
    const key = keysToCheck[i];
    if (typeof required[key] !== typeof input[key]) {
      return true;
    }
  }
  return false;
}
class ValidationLayer {
  /**
   *
   * @param {{}} requiredValues whatever keys that are required they must have the correct type you want as well
   * @param {function(Response, Request)} apiCallback
   */
  constructor(requiredValues, apiCallback) {
    this.requiredValues = requiredValues;
    this.callback = apiCallback;
  }
  /**
   *
   * @param {Response} res
   * @param {Request} req
   */
  validate(res, req) {
    if (!validateJSON(this.requiredValues, req.body)) {
      res.status(400).send(new Error("Invalid input"));
      return;
    }
    this.callback(res, req);
  }
}
modules.exports = validateJSON;
