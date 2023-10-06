"use strict";
const status = require("http-status");

module.exports = ({ repo }, app) => {
  app.post("/staticdata/updateCurrentMarketPrice", (req, res, next) => {
    let processDetails = repo.processQueue.addProcessToQueue(
      "/staticdata/updateCurrentMarketPrice"
    );
    // Sync data from vista
    if (processDetails.error == "")
      repo
        .updateMarketPrice()
        .then(() => {
          repo.processQueue.removeProcessFromQueue(processDetails.id);
        })
        .catch((error) => {
          repo.processQueue.updateProcessDetails(processDetails, error.message);
        });

    res.status(202).json(processDetails);
  });

  app.post("/staticdata/cancelsubscription", (req, res, next) => {
    let processDetails = repo.processQueue.addProcessToQueue(
      "/staticdata/cancelsubscription"
    );
    // Sync data from vista
    if (processDetails.error == "")
      repo
        .autoCanExpSubscriptions()
        .then(() => {
          repo.processQueue.removeProcessFromQueue(processDetails.id);
        })
        .catch((error) => {
          repo.processQueue.updateProcessDetails(processDetails, error.message);
        });

    res.status(202).json(processDetails);
  });

  app.get("/queue/:id", (req, res, next) => {
    let process = repo.processQueue.getProcessDetails(req.params.id);

    if (process) {
      if (process.error) repo.processQueue.removeProcessFromQueue(process.id);
      res.status(200).json(process);
    } else {
      res.status(200).json("{}");
    }
  });

  app.post("/staticdata/subscriptionremainder", (req, res, next) => {
    let processDetails = repo.processQueue.addProcessToQueue(
      "/staticdata/subscriptionremainder"
    );
    // Sync data from vista
    if (processDetails.error == "")
      repo
        .subscriptionPurchaseRemainder()
        .then(() => {
          repo.processQueue.removeProcessFromQueue(processDetails.id);
        })
        .catch((error) => {
          repo.processQueue.updateProcessDetails(processDetails, error.message);
        });

    res.status(202).json(processDetails);
  });

  app.post("/staticdata/pushnotifications", (req, res, next) => {
    let processDetails = repo.processQueue.addProcessToQueue(
      "/staticdata/pushnotifications"
    );
    // Sync data from vista
    if (processDetails.error == "")
      repo
        .sendPushNotifications()
        .then(() => {
          repo.processQueue.removeProcessFromQueue(processDetails.id);
        })
        .catch((error) => {
          repo.processQueue.updateProcessDetails(processDetails, error.message);
        });

    res.status(202).json(processDetails);
  });
};
