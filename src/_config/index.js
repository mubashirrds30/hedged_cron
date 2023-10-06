module.exports = Object.assign(
  {},
  {
    server: {
      port: process.env.PORT || 8000,
      env: process.env.ENVTYPE || "dev",
      ssl: {
        key: process.env.SSLPATH_KEY,
        cert: process.env.SSLPATH_CERT,
      },
    },
    db: {
      server: process.env.DB_SERVER_NAME || "127.0.0.1",
      port: process.env.DB_SERVER_PORT || 3306,
      dbName: process.env.DB_NAME || "hedged-staging",
      username: process.env.DB_SERVER_USER || "root",
      password: process.env.DB_SERVER_PASSWORD || "mubashir@30",

      // server:
      //   process.env.DB_SERVER_NAME ||
      //   "hedgedproddb.cvy2tk6gl6vj.ap-south-1.rds.amazonaws.com",
      // dbName: process.env.DB_NAME || "hedged-staging",

      // username: process.env.DB_SERVER_USER || "cron_staging",
      // password: process.env.DB_SERVER_PASSWORD || "pvj0RttbLxOmMyGZMPjb",
      // dbName: process.env.DB_NAME || "hedged_digital",
      // username: process.env.DB_SERVER_USER || "digitalsalt",
      // password: process.env.DB_SERVER_PASSWORD || "8YpvnVyZQQKntxVKTl07",

      logging: process.env.DB_COMMANDS_LOGGING
        ? process.env.DB_COMMANDS_LOGGING === "true"
        : false,
      connectionLimit: process.env.DB_CONNECTION_POOL || "5",
      redisServer: process.env.REDIS_SERVER_NAME || "127.0.0.1",
      // "hedged-redis.evs2cc.ng.0001.aps1.cache.amazonaws.com",
      redisPort: process.env.REDIS_PORT || 6379,
      redisExpiry: process.env.REDIS_EXPIRY || 600,
    },
    sentryDNS:
      process.env.SENTRY_DSN ||
      "https://3b92fd65f32e49c18778221475c30731@o4504270805008384.ingest.sentry.io/4504297894838272",
    enableSentry: process.env.SENTRY_ENABLE || false,
    stockApi: {
      url: "https://yh-finance.p.rapidapi.com",
      apikey: "6ac577cc4cmsh0a2f575a97b4508p18b3bdjsnf24f213307bb",
      quoteApi: "/market/v2/get-quotes",
      region: "IN",
      apikeyname: "x-rapidapi-key",
      bh_starttime: "09:00:00",
      bh_endtime: "15:30:00",
      excludeDays: ["SAT", "SUN"],
    },
    autoCancel: {
      subFetchLimit: process.AUTO_CAN_SUB_FETCH_LIMIT
        ? process.AUTO_CAN_SUB_FETCH_LIMIT
        : 10,
    },
    timezone: "Asia/Kolkata",
    subscriptionRemainderOptions: {
      remainderPriorDays: "7/4/1",
      dateFormat: "YYYY-MM-DD",
    },

    emailConfig: {
      host: "smtp-relay.sendinblue.com",
      port: 587,
      secure: true,
      Apikey:
        "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",
      fromName: "Hedged",
      fromEmail: "dev@hedged.in",
      user: "dev@hedged.in",
      password: "yFZG3pQWzmnv05Ts",
      tls: {
        ciphers: "SSLv3",
      },
    },
    pushNotificationConfig: {
      apiKey:
        process.env.PUSH_NOTIFICATION_API_KEY ||
        "ZWYxZGM3ZjItNzY3OS00MzVmLThkNjgtMTQ3YjA1NWEyNDU4",
      appId:
        process.env.PUSH_NOTIFICATION_APP_ID ||
        "4f159434-1d88-40b7-b631-cfc8e3396203",
      dbDataFetchLimit: 600,
    },
    awsConfig: {
      publickey: process.env.PUBLIC_KEY || "AKIA5ZL4JQBRMSL362TV",
      privatekey:
        process.env.PRIVATE_KEY || "USZImqfGlqYvTG0WqNkg9kva9Xvb6+jd1JNY0AMg",
      region: process.env.REGION || "ap-south-1",
      baseUrl: process.env.BASE_URL || "",
      bucket: process.env.BUCKET || "hedged-prod-cmp",
      cmpFilePath: process.env.CMP_FILE_PATH || "stocks.csv",
    },
  }
);
