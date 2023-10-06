"use strict";
const model = require("../_base/model");
const moment = require("moment-timezone");
const {
  timezone,
  subscriptionRemainderOptions,
  emailConfig,
} = require("../../_config/index");
const ejs = require("ejs-html");
const nodemailer = require("nodemailer");

const callsStaticRepo = (dbo) => {
  const subscriptionDb = new model(dbo, "subscriptions");
  const emailTemplateDb = new model(dbo, "emailtemplates");
  const userDb = new model(dbo, "users");

  const intiateSubcriptionRemainder = () => {
    return new Promise(async (resolve, reject) => {
      try {
        let requestPromises = [];
        let failedResponses = [];
        let remainderDaysArr =
          subscriptionRemainderOptions.remainderPriorDays.split("/");
        let remaiderTemplate = await getEmailTemplate();
        let dateFormat = subscriptionRemainderOptions.dateFormat;
        let currentDate = moment().tz(timezone).format(dateFormat);
        for (let days of remainderDaysArr) {
          let priorDate = moment(currentDate)
            .add(parseInt(days) + 1, "days")
            .format(dateFormat);
          let expiryDate = moment(currentDate)
            .add(days, "days")
            .format(dateFormat);
          let subcriptionData = await getAliveSubscriptionData(
            priorDate,
            expiryDate
          );
          if (subcriptionData.length > 0) {
            let emailDataArr = await getEmailBody(
              subcriptionData,
              remaiderTemplate,
              days,
              moment(expiryDate).tz(timezone).format("DD-MM-YYYY")
            );
            emailDataArr.map((item) =>
              requestPromises.push(
                sendEmail(item.toEmail, item.template, item.subject)
              )
            );
            Promise.all(requestPromises).catch((ex) => {
              sentryMessage(ex.message);
            });
          }
        }
      } catch (err) {
        reject(err);
      }
      resolve();
    });
  };

  const getEmailBody = (subcriptionData, htmlTemplate, days, expiryDate) => {
    return new Promise(async (resolve, reject) => {
      let emailData = [];

      for (let item of subcriptionData) {
        let userDetails = await userDb.select({
          where: `id =${item.userid}`,
          fields: "id,name",
        });
        if (userDetails.length > 0) {
          let context = {
            planname: item.plantype,
            days: days,
            expiryDate: expiryDate,
            amount: item.value,
            firstname: userDetails[0].name,
            daystext: days == 1 ? "day" : "days",
          };
          emailData.push({
            toEmail: item.email,
            template: template(context, htmlTemplate.body),
            subject: htmlTemplate.subject
              .replace("{name}", context.planname)
              .replace("{day}", context.days)
              .replace("{daystext}", context.daystext),
          });
        }
      }

      resolve(emailData);
    });
  };

  const getAliveSubscriptionData = (date, nextDate) => {
    return new Promise(async (resolve, reject) => {
      let data = await subscriptionDb.select({
        where: `status=1 AND enddate<='${date}' AND enddate>='${nextDate}'`,
      });
      if (data) resolve(data);
      resolve([]);
    });
  };

  const getEmailTemplate = () => {
    return new Promise(async (resolve, reject) => {
      try {
        let data = await emailTemplateDb.select({
          where: `type='subscriptionReminder'`,
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
    } catch (err) {
      sentryMessage(err.message);
    }
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
    intiateSubcriptionRemainder,
  });
};

const initcallsStaticRepo = (dbo) => {
  return callsStaticRepo(dbo);
};

module.exports = Object.assign({}, { initcallsStaticRepo });
