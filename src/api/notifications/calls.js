const { pushNotificationConfig } = require("../../_config/index");
const model = require("../_base/model");
const sentryMessage = require("../../utils/errorlogging");

const callUtilRepo = (dbo) => {
  const dboUsersModel = new model(dbo, "users");
  const dbSubscriptionModel = new model(dbo, 'subscriptions');
  const getTargetUsers = async (notificationData, plans) => {
    try {
      let call = JSON.parse(notificationData.data);

      let callPlan = plans.find((elm) => elm.planid === call.planid);
      if (!callPlan) {
        return [];
      }
      // for free calls(except new calls ) send notification to only subscribed users for tracking.
      let query;
      let planIds = [];
      let users = [];
      let freeUsers = [];
      let primeUsers = [];
      let crownUsers = [];
      let two_hrUsers = [];
      let subscribedUsers = [];
      // if (callPlan.planType.toLowerCase() === "free" && call.call_status.toLowerCase() != "view") {
      //     query = `CALL GetSubscribedUsersForCallTracking(${call.id}, ${pushNotificationConfig.dbDataFetchLimit}, ${notificationData.sent_count})`
      //     subscribedUsers = await dbo.rawQuery(query);
      //     if (subscribedUsers && subscribedUsers.length > 0)
      //         subscribedUsers = subscribedUsers[0];

      let freePlan = plans.find((elm) => elm.planName.toLowerCase() == "free");
      let primePlan = plans.find(
        (elm) => elm.planName.toLowerCase() == "prime"
      );
      let crownPlan = plans.find(
        (elm) => elm.planName.toLowerCase() == "crown"
      );
      let twohrPlan = plans.find(
        (elm) => elm.planName.toLowerCase() == "2hr"
      );
      // let callPlan = plans.find(elm => elm.id == call.planid);
      if (callPlan.planName.toLowerCase() === "free") {
        if (call.call_status.toLowerCase() === "view")
          planIds = [freePlan.id, crownPlan.id, primePlan.id];
        else {
          planIds = [];
          query = `CALL GetSubscribedUsersForCallTracking(${call.id}, ${pushNotificationConfig.dbDataFetchLimit}, ${notificationData.sent_count})`;
          subscribedUsers = await dbo.rawQuery(query);
          if (subscribedUsers && subscribedUsers.length > 0)
            subscribedUsers = subscribedUsers[0];
        }
      }
      else if (callPlan.planName.toLowerCase() === "prime")
        planIds = [crownPlan.id, primePlan.id];
      else if (callPlan.planName.toLowerCase() === "crown")
        planIds = [crownPlan.id];
      else if (callPlan.planName.toLowerCase() === "2hr")
        planIds = [crownPlan.id, primePlan.id, twohrPlan.id];

      let callTarget = [];

      if (call.call_target === "Both") {
        callTarget = ["Experienced", "Newbie"];
      } else {
        callTarget = [call.call_target];
      }

      // console.log({ planIds });

      if (planIds.length && planIds.includes(freePlan.id)) {
        freeUsers = await dboUsersModel.select({
          where:
            "notificationTokens is not null and experience in ? and planid in ?",
          filter: [[callTarget], [[freePlan.id]]],
          fields: "id,notificationTokens",
        });
      }

      if (planIds.length && planIds.includes(primePlan.id)) {
        primeUsers = await dboUsersModel.select({
          where:
            "notificationTokens is not null and experience in ? and planid in ?",
          filter: [[callTarget], [[primePlan.id]]],
          fields: "id,notificationTokens",
        });
      }

      if (planIds.length && planIds.includes(crownPlan.id)) {
        try {
          // crownUsers = await dboUsersModel.select({
          //   where:
          //     "notificationTokens is not null and experience in ? and planid in ?",
          //   filter: [[["Experienced", "Newbie"]], [[crownPlan.id]]],
          //   fields: "id,notificationTokens",
          // });

          let crownUsersId = await dboUsersModel.select({
            where:
              "notificationTokens is not null and experience in ? and planid in ?",
            filter: [[["Experienced", "Newbie"]], [[crownPlan.id]]],
            fields: "id",
          });

          // crownUsersId = Object.values(JSON.parse(JSON.stringify(crownUsersId)));

          let mapedId = crownUsersId.map((x) => x.id)

          let subscribedUsers = await dbSubscriptionModel.select({
            where: "userid in ? and startdate > ?",
            filter: [[mapedId], [[notificationData.createdAt]]],
            groupby: "group by userid",
            // orderby:"order by createdAt DESC",
            fields: "userid,MAX(createdAt) as latestCreatedAt"
          })

          let subscriptionsUserId = subscribedUsers.map(x => x.userid);
          console.log(mapedId, "mapedId", notificationData.createdAt,
            'notificationData.createdAt', subscriptionsUserId);

          if (subscriptionsUserId.length <= 0) {
            console.log('no crown user found');
            return [];
          }
          console.log(subscriptionsUserId.length, 'subscriptionsUserId length');

          crownUsers = await dboUsersModel.select({
            where:
              "notificationTokens is not null and experience in ? and id in ?",
            filter: [[["Experienced", "Newbie"]], [subscriptionsUserId]],
            fields: "id,notificationTokens",
          });
          crownUsers = Object.values(JSON.parse(JSON.stringify(crownUsers)));
        } catch (error) {
          console.log(error, 'error in crown join');
          return [];
        }

        console.log(crownUsers.length, 'crownUsers', 'getSubscribedDate', crownUsers[0]);
      }

      if (planIds.length && planIds.includes(twohrPlan.id)) {
        try {
          // crownUsers = await dboUsersModel.select({
          //   where:
          //     "notificationTokens is not null and experience in ? and planid in ?",
          //   filter: [[["Experienced", "Newbie"]], [[crownPlan.id]]],
          //   fields: "id,notificationTokens",
          // });

          let twohrUsersId = await dboUsersModel.select({
            where:
              "notificationTokens is not null and experience in ? and planid in ?",
            filter: [[["Experienced", "Newbie"]], [[twohrPlan.id]]],
            fields: "id",
          });

          // crownUsersId = Object.values(JSON.parse(JSON.stringify(crownUsersId)));

          let mapedId = twohrUsersId.map((x) => x.id)

          let subscribedUsers = await dbSubscriptionModel.select({
            where: "userid in ? and startdate > ?",
            filter: [[mapedId], [[notificationData.createdAt]]],
            groupby: "group by userid",
            // orderby:"order by createdAt DESC",
            fields: "userid,MAX(createdAt) as latestCreatedAt"
          })

          let subscriptionsUserId = subscribedUsers.map(x => x.userid);
          // console.log(mapedId, "mapedId", notificationData.createdAt,
          //   'notificationData.createdAt', subscriptionsUserId);

          if (subscriptionsUserId.length <= 0) {
            console.log('no crown user found');
            return [];
          }
          // console.log(subscriptionsUserId.length, 'subscriptionsUserId length');

          two_hrUsers = await dboUsersModel.select({
            where:
              "notificationTokens is not null and experience in ? and id in ?",
            filter: [[["Experienced", "Newbie"]], [subscriptionsUserId]],
            fields: "id,notificationTokens",
          });
          two_hrUsers = Object.values(JSON.parse(JSON.stringify(two_hrUsers)));
        } catch (error) {
          console.log(error, 'error in crown join');
          return [];
        }

        // console.log(crownUsers.length, 'crownUsers', 'getSubscribedDate', crownUsers[0]);
      }

      // console.log({ freeUsers });

      if (freeUsers.length) {
        users.push(...freeUsers);
      }

      if (primeUsers.length) {
        users.push(...primeUsers);
      }

      if (crownUsers.length) {
        users.push(...crownUsers);
      }
      if (two_hrUsers.length) {
        users.push(...two_hrUsers)
      }
      // console.log({ users });

      if (subscribedUsers && subscribedUsers.length > 0)
        users = users.concat(subscribedUsers);
      // query = `CALL GetTargetUsersByCallPlan(${callPlan.planid},"${call.call_target}", ${pushNotificationConfig.dbDataFetchLimit}, ${notificationData.sent_count})`

      return users;
    } catch (error) {
      sentryMessage(error.message);
    }
  };
  const getPushNotifData = (notificationData) => {
    let data = JSON.parse(notificationData.data);
    let pushNotifData = {};
    if (notificationData.event === "call") pushNotifData.callId = data.id;
    else if (notificationData.event === "bundle")
      pushNotifData.bundleId = data.id;
    else if (notificationData.event === "intraday")
      pushNotifData.intradayId = data.id;
    return pushNotifData;
  };
  return {
    getTargetUsers,
    getPushNotifData,
  };
};

module.exports = {
  callUtilRepo,
};
