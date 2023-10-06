const { onesignalRequests } = require("./requests");
const utils = require("./_common/util");
let restAPIKey, requests, appId;

const init = (appId, apiKey, options) => {
  appId = appId;
  restAPIKey = apiKey;
  requests = new onesignalRequests(restAPIKey, options);
};

module.exports = (appId, apiKey, options) => {
  requests = new onesignalRequests(apiKey, options);

  const createNotification = async (
    notificationContents,
    notificationData,
    playerIds
  ) => {
    let payload = {
      app_id: appId,
      data: notificationData,
      content_available: true,
      include_player_ids: playerIds,
      large_icon: "https://hedged.in/icon-hedge-square.png",
    };
    if (notificationContents.title && notificationContents.title.message) {
      payload.headings = { en: notificationContents.title.message };
    }
    if (
      notificationContents.content &&
      notificationContents.content.message != ""
    ) {
      payload.contents = { en: notificationContents.content.message };
    }

    let [err, response] = await utils.awaitHandler(
      requests.processPostRequest(
        "https://onesignal.com/api/v1/notifications",
        payload
      )
    );
    if (err) return Promise.reject(err);
    return response;
  };
  return { createNotification };
};
