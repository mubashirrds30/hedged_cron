const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const bodyparser = require("body-parser");
const https = require("https");
const fs = require("fs");
const cron = require("node-cron");
const sentryMessage = require("../utils/errorlogging");

const start = (options, api) => {
  return new Promise((resolve, reject) => {
    console.log(options, 'options')
    const { port } = options.settings;
    const { repo } = options;
    const { env } = options.settings;

    if (!repo)
      reject(
        new Error("The server must be started with a connected repository")
      );
    if (!port)
      reject(new Error("The server must be started with an available port"));

    const app = express();
    app.use(morgan(env));
    app.use(helmet());
    app.use(bodyparser.json());
    app.use((err, req, res, next) => {
      sentryMessage(err.message);
      reject(new Error("Something went wrong!, err:" + err));
      res.status(500).send("Something went wrong!");
    });

    api(app);

    resolve(

      app.listen(port, () => {
        console.log('resolve methd hit', port,);
        // cron.schedule("*/10 * * * * *", () => {
        //   console.log("initated")
        //   repo
        //     .updateMarketPrice()
        //     .then(() => {
        //       const date = new Date();
        //       const time = date.toLocaleTimeString();
        //       console.log("update market price updated", { time });
        //     })
        //     .catch((ex) => {
        //       console.log(ex)
        //       sentryMessage(
        //         `current market price update job failed with err: ${ex.message}`
        //       );
        //     });
        // });
        // cron.schedule("0 0 * * *", () => {
        //   repo
        //     .autoCanExpSubscriptions()
        //     .then(() => {
        //       const date = new Date();
        //       const time = date.toLocaleTimeString();
        //       console.log("auto cancellation done", { time });
        //     })
        //     .catch((ex) => {
        //       sentryMessage(
        //         `auto cancel expired subscriptions job failed with err: ${ex.message}`
        //       );
        //     });
        // });
        cron.schedule("*/10 * * * * *", () => {
          // console.log(repo,'repo');
          repo
            .sendPushNotifications()
            .then(() => {
              console.log('push notification');
              const date = new Date();
              const time = date.toLocaleTimeString();
              console.log("push notification sent", { time });
            })
            .catch((ex) => {
              sentryMessage(
                `push notification job failed with err: ${ex.message}`
              );
            });
        });

        // cron.schedule("0 0 * * *", () => {
        //   repo
        //     .subscriptionPurchaseRemainder()
        //     .then(() => {
        //       const date = new Date();
        //       const time = date.toLocaleTimeString();
        //       console.log("subscription remainder sent", { time });
        //     })
        //     .catch((ex) => {
        //       sentryMessage(
        //         `subscription remainder job failed with err: ${ex.message}`
        //       );
        //     });
        // });
        // cron.schedule("*/10 * * * * *", () => {
        //   repo
        //     .updateBundlesCurrentReturn()
        //     .then(() => {
        //       const date = new Date();
        //       const time = date.toLocaleTimeString();
        //       console.log("update current return", { time });
        //     })
        //     .catch((ex) => {
        //       console.log(ex.message);
        //       //  sentryMessage(
        //       //    `current market price update job failed with err: ${ex.message}`
        //       //  );
        //     });
        // });

        // cron.schedule("*/10 * * * * *", () => {
        //   repo
        //     .notificationsUserCount()
        //     .then(() => {
        //       const date = new Date();
        //       const time = date.toLocaleTimeString();
        //       console.log("count user notification", { time });
        //     })
        //     .catch((ex) => {
        //       sentryMessage(
        //         `push notification job failed with err: ${ex.message}`
        //       );
        //     });
        // });
      })
    );
  });
};

module.exports = Object.assign({}, { start });
