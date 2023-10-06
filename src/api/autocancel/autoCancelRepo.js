"use strict";
const request = require("../../_common/requests.js");
const model = require("../_base/model");
const requestsHandler = new request.requests();
let moment = require("moment-timezone");
const ejs = require("ejs-html");
const nodemailer = require("nodemailer");
const { timezone, autoCancel, emailConfig } = require("../../_config/index");
const utils = require("../../_common/util");

const autoCancelStaticRepo = (dbo) => {
  const dboUserMembershipsModel = new model(dbo, "users_memberships");
  const emailTemplateDb = new model(dbo, "emailtemplates");
  const userDb = new model(dbo, "users");

  const processAutoCancellation = async () => {
    let expiredSubscriptions = await getExpiredSubscriptions();
    for (let subscription of expiredSubscriptions) {
      let recurringRecord = await getRecurringRecord(subscription);
      if (recurringRecord) {
        await cancelSubscription(subscription);
        await updateStatus(subscription, recurringRecord);
        await getEmailBody(subscription);
        // await updateSubscriptionStatus(subscription);
        // await updateRecurringRecordStatus(recurringRecord);
      }
    }
  };

  const getExpiredSubscriptions = async () => {
    let currentTime = moment().tz(timezone);
    let query = `CALL GetExpiredSubscriptions('${currentTime.format()}', ${
      autoCancel.subFetchLimit
    })`;
    utils.log(query);
    let data = await dbo.rawQuery(query);
    if (data && data[0]) return JSON.parse(JSON.stringify(data[0]));
    return [];
  };
  const getRecurringRecord = async (subscription) => {
    let query = `select * from recurrings where subscriptionid=${
      subscription.id
    } and startdate >= '${moment(subscription.enddate)
      .tz(timezone)
      .format("YYYY-MM-DD")}' and status != 5 limit 1`;

    let data = await dbo.rawQuery(query);
    if (data && data[0]) return JSON.parse(JSON.stringify(data[0]));
    return null;
  };
  const updateStatus = async (subscription, recurringRecord) => {
    let queries = [
      `update subscriptions set status=5, updatedAt=NOW() where id=${subscription.id}`,
      `update recurrings set status=3, updatedAt=NOW() where id=${recurringRecord.id}`,
    ];
    let [err, status] = await utils.awaitHandler(dbo.transactionQuery(queries));
    if (err) return Promise.reject("UNABLE_TO_UPDATE_STATUS");
  };
  const cancelSubscription = async (subscription) => {
    let freePlan = await getFreePlanInfo();
    await changeUserToFreeUser(subscription, freePlan);
    await stampMembershipRecord(subscription);
  };
  const changeUserToFreeUser = async (subscription, freePlan) => {
    let query = `update users set type='FREEUSER',membershipType='FREE',planid=${freePlan.planid},accesstoken='',refreshtoken='', updatedAt=NOW() where id=${subscription.userid}`;
    let status = await dbo.rawQuery(query);
  };
  const stampMembershipRecord = async (subscription) => {
    let memberShipRecord = {
      pid: subscription.userid,
      membershiptype: "FREE",
      membershipid: subscription.membershipid,
      planid: subscription.planid,
    };
    let status = await dboUserMembershipsModel.insert(memberShipRecord);
  };
  const getFreePlanInfo = async () => {
    let query = `select planid from plans where planType='FREE'`;
    let data = await dbo.rawQuery(query);
    if (data && data[0]) return JSON.parse(JSON.stringify(data[0]));
    return null;
  };
  const updateSubscriptionStatus = async (subscription) => {
    let query = `update subscriptions set status=5, updatedAt=NOW() where id=${subscription.id}`;
    let status = await dbo.rawQuery(query);
  };
  const updateRecurringRecordStatus = async (recurringRecord) => {
    let query = `update recurrings set status=3, updatedAt=NOW() where id=${recurringRecord.id}`;
    let status = await dbo.rawQuery(query);
  };

  const getEmailBody = (subcriptionData) => {
    return new Promise(async (resolve, reject) => {
      let emailData = [];

      let htmlTemplate = await getEmailTemplate();

      let users = await userDb.select({
        where: `id =${subcriptionData.userid}`,
        filter: [1, 1],
        fields: "id,name,membershipid,membershiptype,phonenumber",
      });

      let context = {
        planname: subcriptionData.plantype,
        date: moment(subcriptionData.enddate).tz(timezone).format("DD/MM/YYYY"),
        name: users[0].name,
        amount: subcriptionData.value,
      };

      let email = subcriptionData.email;

      await sendEmail(
        email,
        template(context, htmlTemplate.body),
        htmlTemplate.subject
      );

      resolve({});
    });
  };

  const getEmailTemplate = () => {
    return new Promise(async (resolve, reject) => {
      try {
        let data = await emailTemplateDb.select({
          where: `type='subscriptionCancelled'`,
        });
        if (data && data.length > 0) resolve(data[0]);
        reject(new Error("no template Avialable for the type"));
      } catch (e) {
        reject(new Error("error in getting Email Template"));
      }
    });
  };

  const template = (context, dir) => {
    try {
      dir = dir.replace(/{{/g, "<%=").replace(/}}/g, "%>");
      dir = dir.replace(/<script>/g, "").replace(/<\/script\>/g, "");
      dir = dir.replace(/{={/g, "<%").replace(/}=}/g, "%>");

      let html = ejs.render(dir, context, {
        vars: Object.keys(context),
      });
      return html;
    } catch (err) {}
  };

  const sendEmail = (toEmail, template, subject) => {
    let smtpConfig = {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: false,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password,
      },
      tls: emailConfig.tls,
    };
    let transporter = nodemailer.createTransport(smtpConfig);
    let fromEmail = emailConfig.fromEmail;

    let mailOptions = {
      from: "" + emailConfig.fromName + " <" + fromEmail + ">",
      to: toEmail,
      subject: subject,
      html: template,
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          reject(error);
        } else {
          resolve(info.response);
        }
      });
    });
  };

  return Object.create({
    processAutoCancellation,
  });
};

const initcallsStaticRepo = (dbo) => {
  return autoCancelStaticRepo(dbo);
};

module.exports = Object.assign({}, { initcallsStaticRepo });
