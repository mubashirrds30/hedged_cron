"use strict";
const { EventEmitter } = require("events");
const dbclient = require("./_common/dbClient");
const server = require("./_common/server");
const repository = require("./api/repo");
const _api = require("./api/api");
const config = require("./_config/");
const redis = require("redis");
const mediator = new EventEmitter();
const Sentry = require("@sentry/node");
require("@sentry/tracing");
const sentryMessage = require("./utils/errorlogging");

if (config.enableSentry) {
  Sentry.init({
    dsn: config.sentryDNS,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1,
    // integrations: [new ProfilingIntegration()],
  });
}

process.on("uncaughtException", (err) => {
  sentryMessage(err.message);
});

process.on("uncaughtRejection", (err, promise) => {
  sentryMessage(err.message);
});

mediator.on("boot.ready", () => {
  let rep;
  dbclient
    .connect(config.db)
    .then((dbo) => {
      console.log(dbo, 'dbo check')
      dbo.redisClient = redis.createClient({
        host: config.db.redisServer,
        port: config.db.redisPort,
        retry_strategy: (options) => {
          let retryDelay = process.env.REDIS_RETRY_DELAY || 3000;
          let retryAttemps = process.env.REDIS_RETRY_DELAY || 300;

          if (options.attempt > retryAttemps) {
            // End reconnecting with built in error

            sentryMessage("redis connection retry attempts exceeded");
            return undefined;
          }

          // reconnect after
          return retryDelay;
        },
      });
      dbo.redisClient.on("error", (err) => {
        sentryMessage(err.message);
      });

      repository
        .initReopository({ dbo: dbo })
        .then((repo) => {
          console.log(repo, 'repo check')
          rep = repo;
          console.log(repo, 'repo');
          return server
            .start(
              {
                settings: config.server,
                repo,
              },
              (app) => {
                const api = _api.bind(null, {
                  repo,
                });
                return api(app);
              }
            )
            .then((app) => {
              app.on("close", () => {
                dbo.end();
              });
            })
            .catch((ex) => {
              sentryMessage(ex.message);
            });
        })
        .catch(async (err) => {
          sentryMessage(err.message);
          await dbo.end();
        });
    })
    .catch((err) => {
      sentryMessage(err.message);
    });
});

mediator.emit("boot.ready");
