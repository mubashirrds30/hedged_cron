"use strict";
const callsStaticDataRepo = require("./calls/callsRepo");
const bundleCallsRepo = require("./bundles_calls/bundlesCallsRepo");
const queueDataRepo = require("./queue/queueRepo");
const subscriptionRemainderRepo = require("./subscriptionremainder/subRemainderRepo");
const autoCancelStaticDataRepo = require("./autocancel/autoCancelRepo");
const pushNotificationsStaticDataRepo = require("./notifications/pushNotif");
const notificationViewedStaticDataRepo = require("./notifications/notificationViewed");

const utils = require("../_common/util");
const repository = (settings) => {
  // const ncrEP = settings.ncrEP;
  // const sysEP = settings.sysEP;
  const dbo = settings.dbo;

  let callsRepo = callsStaticDataRepo.initcallsStaticRepo(dbo);
  let bundleCalls = bundleCallsRepo.initcallsStaticRepo(dbo);
  let autoCancelRepo = autoCancelStaticDataRepo.initcallsStaticRepo(dbo);
  let pushNotificationRepo =
    pushNotificationsStaticDataRepo.initcallsStaticRepo(dbo);
  let notificationViewedRepo =
    notificationViewedStaticDataRepo.initcallsStaticRepo(dbo);
  let processQueue = queueDataRepo.initReopository();
  let remaindeRepo = subscriptionRemainderRepo.initcallsStaticRepo(dbo);

  const updateMarketPrice = () => {
    return new Promise(async (resolve, reject) => {
      try {
        await callsRepo
          .processCurrentMarketPrice()
          // .then(async () => {
          //   await bundleCalls
          //     .processCurrentMarketPrice()
          //     .then(async () => {
          //       resolve({});
          //     })
          //     .catch((err) => {
          //       reject(`Error while updating market price.${err}`);
          //     });
          // })
          .catch((err) => {
            reject(`Error while updating market price.${err}`);
          });
      } catch (err) {
        reject(err);
      }
    });
  };

  const updateBundlesCurrentReturn = () => {
    return new Promise(async (resolve, reject) => {
      try {
        await bundleCalls
          .processCurrentReturn()
          .then(async () => {
            resolve({});
          })
          .catch((err) => {
            reject(`Error while updating current return.${err}`);
          });
      } catch (err) {
        reject(err);
      }
    });
  };

  const updateBundlesMarketPrice = () => {
    return new Promise(async (resolve, reject) => {
      try {
        await bundleCalls
          .processCurrentMarketPrice()
          .then(async () => {
            resolve({});
          })
          .catch((err) => {
            reject(`Error while updating market price.${err}`);
          });
      } catch (err) {
        reject(err);
      }
    });
  };

  const subscriptionPurchaseRemainder = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        let remainderStatus = await remaindeRepo.intiateSubcriptionRemainder();

        resolve({});
      } catch (error) {
        reject(error);
      }
    });
  };

  const autoCanExpSubscriptions = async () => {
    return new Promise(async (resolve, reject) => {
      let [err, status] = await utils.awaitHandler(
        autoCancelRepo.processAutoCancellation()
      );
      if (err) {
        return reject(err);
      }

      return resolve({});
    });
  };

  const sendPushNotifications = async () => {
    return new Promise(async (resolve, reject) => {
      let [err, status] = await utils.awaitHandler(pushNotificationRepo.init());
      if (err) {
        return reject(err);
      }

      return resolve({});
    });
  };

  const notificationsUserCount = async () => {
    return new Promise(async (resolve, reject) => {
      let [err, status] = await utils.awaitHandler(notificationViewedRepo.init());
      if (err) {
        return reject(err);
      }

      return resolve({});
    });
  };


  return Object.create({
    processQueue,
    updateMarketPrice,
    updateBundlesMarketPrice,
    subscriptionPurchaseRemainder,
    autoCanExpSubscriptions,
    sendPushNotifications,
    updateBundlesCurrentReturn,
    notificationsUserCount
  });
};

const initReopository = (settings) => {
  return new Promise((resolve, reject) => {
    if (!settings) {
      reject(new Error("Settings not supplied!"));
    }
    resolve(repository(settings));
  });
};

module.exports = Object.assign({}, { initReopository });
