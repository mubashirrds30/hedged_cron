const awaitHandler = async (promise) => {
  try {
    let result = await promise;
    return [null, result];
  } catch (e) {
    return [e, null];
  }
};
const log = async (message) => {};

module.exports = {
  awaitHandler,
  log,
};
