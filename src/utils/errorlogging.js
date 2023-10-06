//external libraries
const Sentry = require("@sentry/node");

//capture error or messages with level to group them.
//(levels: fatal, critical, error, warning, log, info, and debug)
const sentryMessage = (message, level = "error") => {
  Sentry.captureMessage(message, level);
};

module.exports = sentryMessage;
