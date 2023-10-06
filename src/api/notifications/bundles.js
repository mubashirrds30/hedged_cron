const { pushNotificationConfig } = require("../../_config/index");
const model = require("../_base/model");

const bundleUtilRepo = (dbo) => {
  const dboNotificationsModel = new model(dbo, "notifications");
  const dboPlansModel = new model(dbo, "plans");
  const dboUsersModel = new model(dbo, "users");

  const getTargetUsers = async (notificationData, plans) => {
    let planIds = [];
    let bundle = JSON.parse(notificationData.data);

    // let plans = await dboPlansModel.select({
    //     fields: "id,planid,planName,planType"
    // })
    let freePlan = plans.find((elm) => elm.planName.toLowerCase() == "free");
    let primePlan = plans.find((elm) => elm.planName.toLowerCase() == "prime");
    let crownPlan = plans.find((elm) => elm.planName.toLowerCase() == "crown");
    let twohrPlan = plans.find((elm) => elm.planName.toLowerCase() == "2hr");

    let bundlePlan = plans.find((elm) => elm.id == bundle.planid);
    if (bundlePlan.planName.toLowerCase() === "free")
      planIds = [freePlan.id, primePlan.id, crownPlan.id];
    else if (bundlePlan.planName.toLowerCase() === "prime")
      planIds = [crownPlan.id, primePlan.id];
    else if (bundlePlan.planName.toLowerCase() === "crown")
      planIds = [crownPlan.id];
    else if (bundlePlan.planName.toLowerCase() === "2hr")
      planIds = [twohrPlan.id];
    // let plans = await dboPlansModel.select({
    //     fields: "id,planid,planName,planType"
    // })

    let users = await dboUsersModel.select({
      where: "notificationTokens is not null and planid in ?",
      filter: [[planIds]],
      fields: "id,notificationTokens",
    });

    return users;

    // let bundle = JSON.parse(notificationData.data);
    // let bundlePlan = plans.find(elm => elm.planid === call.planid);
    // if (!bundlePlan) {
    //     console.error("plan not found");
    //     return [];
    // }
    // // for free calls(except new calls ) send notification to only subscribed users for tracking.
    // let query;
    // if (bundlePlan.planType.toLowerCase() === "free" && call.call_status.toLowerCase() != "new") {
    //     query = `CALL GetSubscribedUsersForCallTracking(${call.id}, ${pushNotificationConfig.dbDataFetchLimit}, ${notificationData.sent_count})`
    // }
    // else {
    //     query = `CALL GetTargetUsersByCallPlan(${bundlePlan.planid}, ${pushNotificationConfig.dbDataFetchLimit}, ${notificationData.sent_count})`
    // }
    // let usersList = await dbo.rawQuery(query);
    // if (usersList && usersList.length > 0)
    //     usersList = usersList[0];
    // return usersList;
  };
  const getPushNotifData = (notificationData) => {
    let call = JSON.parse(notificationData.data);
    return {
      callId: call.id,
    };
  };
  return {
    getTargetUsers,
    getPushNotifData,
  };
};

module.exports = {
  bundleUtilRepo,
};
