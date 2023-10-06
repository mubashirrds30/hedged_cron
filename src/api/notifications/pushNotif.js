"use strict";
const request = require("../../_common/requests.js");
const model = require("../_base/model");
const { pushNotificationConfig, timezone } = require("../../_config/index");
const onesignal = require("../../../ext_modules/onesignal")(
  pushNotificationConfig.appId,
  pushNotificationConfig.apiKey
);
const utils = require("../../_common/util");
const { callUtilRepo } = require("./calls");
const { bundleUtilRepo } = require("./bundles");
const moment = require("moment-timezone");

const pushNotificationStaticRepo = (dbo) => {
  const dboNotificationsModel = new model(dbo, "notifications");
  const dboNotificationsUsersModel = new model(dbo, "notifications_users");
  const dboPlansModel = new model(dbo, "plans");
  const dboUsersModel = new model(dbo, "users");
  const dbSubscriptionModel = new model(dbo, 'subscriptions');

  const callsUtil = callUtilRepo(dbo);
  const bundleUtil = bundleUtilRepo(dbo);
  const init = async () => {
    let currentTime = moment.utc(
      moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss")
    );

    let data = await dboNotificationsModel.select({
      where:
        "sent_status in ? and (scheduled_date is null or scheduled_date < ?)",
      filter: [[[0]], currentTime.format()],
      fields: "id,type,message,sent_status,sent_count,event,subevent,data,createdAt",
    });
    console.log("LN:30, data", data?.length, currentTime.format());
    if (data && data.length === 0) {
    }
    console.log("LN:33 ");
    let plans = await dboPlansModel.select({
      fields: "id,planid,planName,planType",
    });
    // console.log("LN:37 plans",plans)
    // let notification_id = [];
    for (let notification of data) {
      if (notification.sent_status === 0) {
        notification.sent_status = 1;
        notification_id.push(notification.id)
        await updateNotificationStatus(notification);
      }
      if (notification.message)
        notification.message = JSON.parse(notification.message);
      await processNotification(notification, plans);
    }
    // await updateBulkNotificationStatus(notification_id);
    // let currentTime = moment().tz(timezone).format('HH:mm:ss')
    // resolve(true)
  };

  async function updateBulkNotificationStatus(notify_id) {
    return dboNotificationsModel.update({
      fields: {
        sent_status: 1,
        sent_count: notificationData.sent_count,
      },
      where: "id = ?",
      whereValue: {
        id: notificationData.id,
      },
    });
  }

  const processNotification = async (notificationData, plans) => {
    console.log("LN:49 in processNotification");
    let sentToAllUsers = false;
    // while (!sentToAllUsers) {
    console.log("LN:52 in processNotification in while loop", sentToAllUsers);
    let users;
    if (notificationData.event === "call") {
      console.log("LN:55 in processNotification in while loop", sentToAllUsers);
      users = await callsUtil.getTargetUsers(notificationData, plans);
      console.log(users, 'users check with id')
    } else if (notificationData.event === "bundle") {
      console.log("LN:61 in processNotification in while loop");
      users = await bundleUtil.getTargetUsers(notificationData, plans);
    } else if (notificationData.event === "intraday") {
      console.log("intraday");
      try {
        let notifyEx = JSON.parse(notificationData?.data);
        users = await dboUsersModel.select({
          where:
            notifyEx?.planid == 3
              ? "intradaynewsletter = 1 and planid=3"
              : "intradaynewsletter = 1",
          // where: "intradaynewsletter = 1 and (id=37 or id=170 or id=243)",
          // where: "id = 170",
          fields: "id,email,notificationTokens",
        });
      } catch (error) {
        console.log(error);
      }
    }
    // let arrObj = [];
    // for (let index = 0; index < users.length; index++) {
    //   if(users[index]){
    //     console.log(users[index], "users");
    //   }
    //   arrObj.push({
    //     notification_id: notificationData?.id,
    //     user_id: users[index]?.userid,
    //     type: notificationData.event === "call" ? 1 : 2,
    //     status: 0,
    //   });
    // }
    // for (let index = 0; index < arrObj.length; index++) {
    //   await dboNotificationsUsersModel
    //   .insert(arrObj[index])
    //   .then((data) => {
    //     // console.log(data);
    //   })
    //   .catch((err) => {
    //     console.log("err",err);
    //   });
    // }
    let pushNotifData = callsUtil.getPushNotifData(notificationData);
    let notificationTokens = getTokens(users);
    // console.log(
    //   "LN:68 in processNotification in while loop",
    //   notificationTokens?.length
    // );
    notificationTokens = notificationTokens.filter((x) => x !== "");
    // console.log(
    //   "LN:73 in processNotification in while loop after filter",
    //   notificationTokens?.length,
    //   notificationData?.id
    // );

    try {
      console.log("LN:78 in processNotification in while loop try block");
      if (notificationTokens.length > 0) {
        // console.log({
        //   message: notificationData.message,
        //   pushNotifData: pushNotifData,
        // });
        console.log("LN:80 in processNotification in while loop if block");
        let status = await utils.retryHandler(
          () => {
            console.log(
              "LN:84 in processNotification in while loop createNotification "
            );
            // return onesignal.createNotification(
            //   notificationData.message,
            //   pushNotifData,
            //   notificationTokens
            // );
          },
          { retries: 1 }
        );
      }
      console.log("LN:96 in processNotification ");
    } catch (e) {
      console.log("erorr LN:97", e?.message);
      // sentryMessage(e.message);
    }
    console.log("LN:100 in processNotification ");
    // if (users.length < pushNotificationConfig.dbDataFetchLimit) {
    //   console.log(
    //     "LN:103 in processNotification ",
    //     users.length,
    //     "users.length "
    //   );
    //   console.log(
    //     "LN:108 in processNotification ",
    //     pushNotificationConfig.dbDataFetchLimit,
    //     "pushNotificationConfig.dbDataFetchLimit"
    //   );
    sentToAllUsers = true;
    notificationData.sent_status = 2;
    // }
    console.log("LN:116 update notifcation status in while loop");
    notificationData.sent_count += users.length;
    await updateNotificationStatus(notificationData);
    // }
  };
  const getTokens = (users) => {
    // users = JSON.parse(users)
    let tokens = [];
    users.forEach((elm) => {
      elm.notificationTokens = JSON.parse(elm.notificationTokens);
      tokens = tokens.concat(elm.notificationTokens);
    });
    return tokens;
  };
  const updateNotificationStatus = (notificationData) => {
    console.log("LN:130 in updateNotificationStatus");
    return dboNotificationsModel.update({
      fields: {
        sent_status: notificationData.sent_status,
        sent_count: notificationData.sent_count,
      },
      where: "id = ?",
      whereValue: {
        id: notificationData.id,
      },
    });
  };

  return Object.create({
    init,
  });
};

const initcallsStaticRepo = (dbo) => {
  return pushNotificationStaticRepo(dbo);
};

module.exports = Object.assign({}, { initcallsStaticRepo });
