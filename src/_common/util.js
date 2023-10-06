var promiseRetry = require("promise-retry");

const awaitHandler = async (promise) => {
  try {
    let result = await promise;
    return [null, result];
  } catch (e) {
    return [e, null];
  }
};

const retryHandler = async (fun, config = {}) => {
  let status = await promiseRetry((retry, number) => {
    return fun().catch(retry);
  }, config);
  return status;
};

const log = async (message) => {};

module.exports = {
  awaitHandler,
  retryHandler,
  log,
};
