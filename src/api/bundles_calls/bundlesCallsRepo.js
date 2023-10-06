("use strict");
const request = require("../../_common/requests.js");
const model = require("../_base/model");
const requestsHandler = new request.requests();
const moment = require("moment-timezone");
const { timezone, stockApi } = require("../../_config/index");
const sentryMessage = require("../../utils/errorlogging");

const callsStaticRepo = (dbo) => {
  const dboCallsModel = new model(dbo, "bundles_calls");
  const dboBundlesModel = new model(dbo, "bundles");
  const dboC = dbo;
  const processCurrentMarketPrice = () => {
    return new Promise(async (resolve, reject) => {
      let data = await dboCallsModel.select({
        filter: [1, 1],
        fields: "bundles_calls.id,bundles_calls.scrip_symbol,bundles.status",
        join: {
          type: "INNER JOIN",
          clause:
            "bundles ON bundles.id = bundles_calls.bundle_id and bundles.status =1",
        },
      });

      let currentTime = moment().tz(timezone).format("HH:mm:ss");
      if (
        currentTime >= stockApi.bh_starttime &&
        currentTime <= stockApi.bh_endtime
      ) {
        if (
          !moment().tz(timezone).isSame(moment().tz(timezone).isoWeekday(6)) ||
          !moment().tz(timezone).isSame(moment().tz(timezone).isoWeekday(7))
        ) {
          for (let item of data) {
            if (item.scrip_symbol !== "") {
              let getCurrentPrice = await requestsHandler
                .processGetRequest(stockApi.url + stockApi.quoteApi, {
                  region: stockApi.region,
                  symbols: item.scrip_symbol,
                })
                .catch((ex) => {
                  return {
                    quoteResponse: {
                      result: [],
                    },
                  };
                  //reject(new Error(ex.message));
                });

              if (
                getCurrentPrice &&
                getCurrentPrice.hasOwnProperty("quoteResponse") &&
                getCurrentPrice.quoteResponse.result.length > 0
              ) {
                item.current_price =
                  getCurrentPrice.quoteResponse.result[0].regularMarketPrice;
                item.market_trend =
                  getCurrentPrice.quoteResponse.result[0]
                    .regularMarketChangePercent < 0
                    ? "Negative"
                    : "Positive";
                updatecachevalues(
                  item.current_price,
                  item.market_trend,
                  item.id
                );
                await updateMartketPriceForCalls(
                  item.current_price,
                  item.market_trend,
                  item.id
                ).then((response) => {});
              } else {
                item.current_price = item.scripname_price;
                item.market_trend = "Neutral";
                await updateMartketPriceForCalls(
                  item.current_price,
                  item.market_trend,
                  item.id
                );
              }
            }
          }
        }
      }
      resolve(true);
    });
  };

  const processCurrentReturn = () => {
    return new Promise(async (resolve, reject) => {
      const bundles = await dboBundlesModel.select({
        fields:
          "id,hedged_capital_required,equity_capital_required,title,use_old_formula",
      });
      for (const data of bundles) {
        const bundleCalls = await dboCallsModel.select({
          where: `bundle_id = ${data.id}`,
          raw: true,
        });

        let equityValue = 0;
        let optionValue = 0;
        let hedged_deployed_capital = 0;
        let hedged_equity_capital = 0;
        bundleCalls.forEach((call) => {
          if (call.call_class === "Equity") {
            if (call.call_status !== "closed") {
              const { minprice, quantity } = JSON.parse(call.info);
              const calc1 = (+call.current_price - +minprice) * +quantity;

              equityValue = equityValue + calc1;
            } else {
              const calc2 =
                +call.returns * (call.close_type === "profit" ? 1 : -1);

              equityValue = equityValue + calc2;
            }

            var { maxprice, quantity } = JSON.parse(call.info);
            hedged_equity_capital = hedged_equity_capital + quantity * maxprice;
          } else {
            if (call?.call_status == "closed") {
              if (call?.close_type == "profit") {
                let value = call?.returns;
                optionValue = optionValue + value;
              } else {
                let value = call?.returns * -1;
                optionValue = optionValue + value;
              }
            }
            // const { legs_info } = JSON.parse(call.info);
            //   legs_info.forEach((leg) => {
            //     if (call.call_status !== "closed") {
            //       // var qt = 0;
            //       // if (leg.type == "sell") {
            //       //   qt = `-${leg.quantity}`;
            //       // } else {
            //       //   qt = leg.quantity;
            //       // }
            //       // qt = parseInt(qt);
            //       // const value = qt * 50 * (call.current_price - leg.price);
            //       // optionValue = optionValue + value;
            //     } else {
            //       console.log(leg,"legs_info leg")
            //       // var qt = 0;
            //       // if (leg.type == "sell") {
            //       //   qt = `-${leg.quantity}`;
            //       // } else {
            //       //   qt = leg.quantity;
            //       // }
            //       // qt = parseInt(qt);

            //       // const value = qt * 50 * (leg.exit_price - leg.price);
            //       // // console.log("qt", qt, leg.exit_price, leg.price);

            //       // optionValue = optionValue + value;
            //       // console.log("else part ", optionValue);
            //     }

            //     hedged_deployed_capital =
            //       hedged_deployed_capital + leg?.quantity * leg?.price * 50;
            //   });
          }
        });

        var finalValue = 0;
        let max_capital = 0;

        switch (data.id) {
          case 162:
            max_capital = 45720;
            break;
          case 163:
            max_capital = 24920;
            break;
          case 200:
            max_capital = 87612;
            break;
          case 201:
            max_capital = 49091;
            break;
          case 205:
            max_capital = 35195;
            break;
          case 206:
            max_capital = 91702;
            break;
          case 207:
            max_capital = 42450;
            break;
          case 209:
            max_capital = 50167;
            break;
          case 210:
            max_capital = 57736;
            break;
          case 211:
            max_capital = 40305;
            break;
          default:
            break;
        }
        finalValue = (
          ((equityValue + optionValue) / max_capital) *
          100
        ).toFixed(2);
             
        // await dboBundlesModel.update({
        //   fields: {
        //     current_returns: finalValue,
        //   },
        //   where: "id=?",
        //   whereValue: {
        //     id: data.id,
        //   },
        // });
      }
      resolve({});
    });
  };

  const updateMartketPriceForCalls = (current_price, market_trend, callid) => {
    return new Promise((resolve, reject) => {
      dboCallsModel
        .update({
          fields: {
            current_price: current_price,
            market_trend: market_trend,
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
        "*cacher_bundles_calls_*_bundles_calls_*",
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
                        x.bundles_calls = x.bundles_calls.map((y) => {
                          if (y.id === callid) {
                            y.current_price = current_price;
                            y.market_trend = market_trend;
                          }
                          return y;
                        });
                        return x;
                      });
                      // parsedCacheValue = parsedCacheValue.map((x) => {
                      //     if (x.id === callid) {
                      //         x.current_price = current_price
                      //         x.market_trend = market_trend
                      //     }
                      //     return x
                      // })

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

  return Object.create({
    processCurrentMarketPrice,
    processCurrentReturn,
  });
};

const initcallsStaticRepo = (dbo) => {
  return callsStaticRepo(dbo);
};

module.exports = Object.assign({}, { initcallsStaticRepo });
