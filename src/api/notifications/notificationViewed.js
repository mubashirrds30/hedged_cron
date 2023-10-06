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

const notificationViewedStaticRepo = (dbo) => {
  const dboNotificationsModel = new model(dbo, "notifications");
  const dboNotificationsUsersModel = new model(dbo, "notifications_users");
  const dboPlansModel = new model(dbo, "plans");

  const callsUtil = callUtilRepo(dbo);
  const bundleUtil = bundleUtilRepo(dbo);
  const init = async () => {
    let currentTime = moment.utc(
      moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss")
    );
    let data = await dboNotificationsModel.select({
      where:
        "notify_user in ? and (scheduled_date is null or scheduled_date < ?)",
      filter: [[[0,1]], currentTime.format()],
      fields:
        "id,type,message,sent_status,sent_count,event,subevent,data,notify_user",
    });
    console.log("LN:30, data", data?.length);
    if (data && data.length === 0) {
    }
    console.log("LN:33 ");
    let plans = await dboPlansModel.select({
      fields: "id,planid,planName,planType",
    });
    // console.log("LN:37 plans",plans)

    for (let notification of data) {
      if (notification.notify_user === 0) {
        notification.notify_user = 1;
        await updateNotificationStatus(notification);
      }
      if (notification.message)
        notification.message = JSON.parse(notification.message);
      await processNotification(notification, plans);
    }

    // let currentTime = moment().tz(timezone).format('HH:mm:ss')
    // resolve(true)
  };
  const processNotification = async (notificationData, plans) => {
    console.log("LN:49 in processNotification");
    let sentToAllUsers = false;
    // while (!sentToAllUsers) {
    console.log("LN:52 in processNotification in while loop", sentToAllUsers);
    let users;
    if (notificationData.event === "call") {
      console.log("LN:55 in processNotification in while loop", sentToAllUsers);
      users = await callsUtil.getTargetUsers(notificationData, plans);
    } else if (notificationData.event === "bundle") {
      console.log("LN:61 in processNotification in while loop");
      users = await bundleUtil.getTargetUsers(notificationData, plans);
    }
    let arrObj = [];
    for (let index = 0; index < users.length; index++) {
      // arrObj.push({
       
      //   // user_id: users[index]?.id,
      //   // notification_id: notificationData?.id,
      //   // type: notificationData.event === "call" ? 1 : 2,
      //   status: 0,
      // });
      arrObj.push((0,1,1,1))

      // arrObj.push((${users[index]?.id},${notificationData?.id},${notificationData.event === "call" ? 1 : 2},0))
    }
    await dboNotificationsUsersModel
      .bulkInsert({
        fields: ["notification_id", "user_id", "type", "status"],
        values: arrObj,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((err) => {
        console.log("err", err);
      });
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

    try {
      console.log("LN:78 in processNotification in while loop try block");
      if (notificationTokens.length > 0) {
        console.log("LN:80 in processNotification in while loop if block");
      }
      console.log("LN:96 in processNotification ");
    } catch (e) {
      console.log("erorr LN:97", e?.message);
      // sentryMessage(e.message);
    }
    console.log("LN:100 in processNotification ");
    sentToAllUsers = true;
    notificationData.notify_user = 2;
    // }
    console.log("LN:116 update notifcation status in while loop");
    await updateNotificationStatus(notificationData);
    // }
  };

  const updateNotificationStatus = (notificationData) => {
    console.log(
      "LN:130 in updateNotificationStatus",
      notificationData?.notify_user
    );
    return dboNotificationsModel.update({
      fields: {
        notify_user: notificationData.notify_user,
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
  return notificationViewedStaticRepo(dbo);
};

module.exports = Object.assign({}, { initcallsStaticRepo });
