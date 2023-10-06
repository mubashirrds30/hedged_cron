"use strict";
const request = require("../../_common/requests.js");
const model = require("../_base/model");
const requestsHandler = new request.requests();
let moment = require("moment-timezone");
const { timezone, stockApi, awsConfig } = require("../../_config/index");
const sentryMessage = require("../../utils/errorlogging");

var AWS = require("aws-sdk");
const { parse } = require("fast-csv");

const s3bucket = new AWS.S3({
  accessKeyId: awsConfig.publickey,
  secretAccessKey: awsConfig.privatekey,
  region: awsConfig.region,
});
const callsStaticRepo = (dbo) => {
  const dboCallsModel = new model(dbo, "calls");
  const dboIntradaysModel = new model(dbo, "intradays");
  const dboC = dbo;
  const processCurrentMarketPrice = () => {
    return new Promise(async (resolve, reject) => {
      let currentTime = moment().tz(timezone).format("HH:mm:ss");

      if (
        currentTime >= stockApi.bh_starttime &&
        currentTime <= stockApi.bh_endtime
      ) {
        if (
          !moment().tz(timezone).isSame(moment().tz(timezone).isoWeekday(6)) ||
          !moment().tz(timezone).isSame(moment().tz(timezone).isoWeekday(7))
        ) {
          let fileContents = await readFileFromAWSBucket(awsConfig.cmpFilePath);

          let marketPrices = await parseJSONfromCSVstring(fileContents);

          let data = await dboCallsModel.select({
            where: "status=? and publish=?",
            filter: [1, 1],
            fields: "id,scripname_symbols,scripname_price, current_price",
          });

          for (let call of data) {
            let callSymbol = call.scripname_symbols.split(".")[0];
            let marketPrice = marketPrices.find(
              (elm) => elm.Symbol === callSymbol
            );
            if (!marketPrice) {
              continue;
            }
            if (call.current_price === +marketPrice.LTP) {
              continue;
            }
            call.current_price = +marketPrice.LTP;
            updatecachevalues(call.current_price, "", call.id);

            let updateStatus = await updateMartketPriceForCalls(
              call.current_price,
              call.id
            );
          }

          try {
            console.log("update");
            // intraday calls
            let data1 = await dboIntradaysModel.select({
              fields: "id,scripname,scripname_price, current_price",
            });


            for (let index = 0; index < data1.length; index++) {
              let call = data1[index];
              console.log("LN:77");

              let symbol = "";
              switch (call?.scripname?.toLowerCase()) {
                case "nifty":
                  symbol = "^NSEI";
                  break;
                case "banknifty":
                  symbol = "^NSEBANK";
                  break;

                case "finnifty":
                  symbol = "FINNIFTY.ns";
                  break;

                default:
                  break;
              }
              console.log("LN:95");
              let icallSymbol = symbol.split(".")[0];
              let marketPrice = marketPrices.find(
                (elm) => elm.Symbol === icallSymbol
              );
              console.log("LN:100");
              if (!marketPrice) {
                continue;
              }
              console.log("LN:104");
              // if (call?.current_price === +marketPrice?.LTP) {
              //   continue;
              // }
              console.log("LN:108");
              call.current_price = +marketPrice.LTP;
              console.log("LN:110");
              console.log("current_price",call.current_price)
              let updateStatus = await updateMartketPriceForIntradayCalls(
                call.current_price,
                call.id
              );
              console.log(call);
            }

          } catch (error) {
            console.log(err);
          }
        }
      }
      // let currentTime = moment().tz(timezone).format('HH:mm:ss')
      // if (currentTime >= stockApi.bh_starttime && currentTime <= stockApi.bh_endtime) {
      //     if (!moment().tz(timezone).isSame(moment().tz(timezone).isoWeekday(6)) || !moment().tz(timezone).isSame(moment().tz(timezone).isoWeekday(7))) {
      //         for (let index = 0; index < data.length; index++) {
      //             let getCurrentPrice = await requestsHandler.processGetRequest(stockApi.url + stockApi.quoteApi, {
      //                 'region': stockApi.region,
      //                 'symbols': data[index].scripname_symbols
      //             }).catch((ex) => {
      //                 console.log("ex", ex)
      //                 console.log("Not able to update market price for the callid - " + data[index].id)
      //                 return {
      //                     "quoteResponse": {
      //                         "result": []
      //                     }
      //                 }
      //             })
      //             if (getCurrentPrice.quoteResponse.result.length > 0) {
      //                 data[index].current_price = getCurrentPrice.quoteResponse.result[0].regularMarketPrice
      //                 data[index].market_trend = getCurrentPrice.quoteResponse.result[0].regularMarketChangePercent < 0 ? 'Negative' : 'Positive'
      //                 updatecachevalues(data[index].current_price, data[index].market_trend, data[index].id);
      //                 await updateMartketPriceForCalls(data[index].current_price, data[index].market_trend, data[index].id).then((response) => {
      //                     console.log("Market Price updated for the callid - " + data[index].id)
      //                 })
      //             } else {
      //                 data[index].current_price = data[index].scripname_price
      //                 data[index].market_trend = "Neutral"
      //                 await updateMartketPriceForCalls(data[index].current_price, data[index].market_trend, data[index].id).then((response) => {
      //                     console.log("Market Price updated for the callid - " + data[index].id)
      //                 })
      //             }
      //         }
      //     }
      // }

      resolve(true);
    });
  };

  const updateMartketPriceForCalls = (current_price, callid) => {
    return new Promise((resolve, reject) => {
      dboCallsModel
        .update({
          fields: {
            current_price: current_price,
            scripname_price: current_price,
          },
          where: "id=?",
          whereValue: {
            id: callid,
          },
        })
        .then(resolve)
        .catch(reject);
    });
  };
  const updateMartketPriceForIntradayCalls = (current_price, callid) => {
    return new Promise((resolve, reject) => {
      dboIntradaysModel
        .update({
          fields: {
            current_price: current_price,
            scripname_price: current_price,
          },
          where: "id=?",
          whereValue: {
            id: callid,
          },
        })
        .then(resolve)
        .catch(reject);
    });
  };

  const updatecachevalues = (current_price, market_trend, callid) => {
    return new Promise((resolve, reject) => {
      dboC.redisClient.scan(
        "0",
        "match",
        "*cacher_calls_*_calls_*",
        "count",
        500,
        (err, res) => {
          if (err) {
            sentryMessage(err.message);
          } else {
            if (res[1].length > 0) {
              res[1].map((key) => {
                dboC.redisClient.get(key, (err, res) => {
                  if (err) {
                    sentryMessage(err.message);
                  }

                  let parsedCacheValue = JSON.parse(res);

                  if (
                    !res ||
                    err ||
                    (Array.isArray(parsedCacheValue) && parsedCacheValue === "")
                  ) {
                  } else {
                    if (parsedCacheValue.length > 0) {
                      parsedCacheValue = parsedCacheValue.map((x) => {
                        if (x.id === callid) {
                          x.current_price = current_price;
                          x.scripname_price = current_price;
                        }
                        return x;
                      });

                      var args = [];
                      var res;
                      try {
                        res = JSON.stringify(parsedCacheValue);
                      } catch (e) {
                        return reject(e);
                      }

                      args.push(key, res);

                      dboC.redisClient.set(args, (err, res) => {
                        if (err) {
                          sentryMessage(err.message);
                        }
                      });
                    }
                  }
                });
              });
            }
          }
        }
      );
    });
  };
  const readFileFromAWSBucket = async (filePath) => {
    let params = {
      Bucket: awsConfig.bucket,
      Key: filePath,
    };

    const response = await s3bucket.getObject(params).promise(); // await the promise
    const fileContent = response.Body.toString("utf-8"); // can also do 'base64' here if desired

    return fileContent;
  };

  return Object.create({
    processCurrentMarketPrice,
  });
};
const parseJSONfromCSVstring = (csvString) => {
  return new Promise((resolve, reject) => {
    let transformedJson = [];
    const stream = parse({
      ignoreEmpty: true,
      headers: ["TS", "Symbol", "LTP"],
    })
      .on("error", (error) => {
        reject(error);
      })
      .on("data", (row) => {
        transformedJson.push(row);
      })
      .on("end", (rowCount) => {
        resolve(transformedJson);
      });

    stream.write(csvString);
    stream.end();
  });
};

const initcallsStaticRepo = (dbo) => {
  return callsStaticRepo(dbo);
};

module.exports = Object.assign({}, { initcallsStaticRepo });
