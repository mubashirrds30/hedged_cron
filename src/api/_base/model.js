"use strict";
const utils = require("../../_common/util");
module.exports = class Model {
  constructor(dbo, tableName) {
    this.dbo = dbo;
    this.tableName = tableName;
    dbo.rawQuery = (rawQuery, connection) => {
      return new Promise((resolve, reject) => {
        let queryInstace = connection ? connection : this.dbo;
        queryInstace.query(rawQuery, (err, result) => {
          // this.dbo.release();
          if (err) return reject(err);
          resolve(result);
        });
      });
    };
    dbo.transactionQuery = (queries) => {
      return new Promise(async (resolve, reject) => {
        dbo.getConnection((error, connection) => {
          connection.beginTransaction(async (err) => {
            for (let query of queries) {
              let [err, status] = await utils.awaitHandler(
                dbo.rawQuery(query, connection)
              );
              if (err) {
                connection.rollback(function () {
                  return reject(err);
                });
              }
            }
            connection.commit((err) => {
              if (err) {
                connection.rollback(function () {
                  return reject(err);
                });
              }
              return resolve();
            });
          });
        });
      });
    };
  }

  select(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        let selectfields = options.hasOwnProperty("fields")
          ? options.fields
          : "*";
        let where = options.hasOwnProperty("where")
          ? `WHERE ${options.where}`
          : "";
        let orderby = options.hasOwnProperty("orderby") ? options.orderby : "";
        let groupby = options.hasOwnProperty("groupby") ? options.groupby : "";
        let limit = options.hasOwnProperty("limit") ? options.limit : "";
        let preparedData = options.hasOwnProperty("filter")
          ? options.filter
          : [];
        let query = `SELECT ${selectfields} FROM ${this.tableName} ${where} ${groupby} ${orderby} ${limit}`;
        if (options.hasOwnProperty("join")) {
          let join = options.join;
          query = query + `${join.type} ${join.clause}`;
        }
        let query1 = this.dbo.query(
          query,
          preparedData,
          (err, result, fields) => {
            // this.dbo.release();
            if (err) return reject(err);
            resolve(result);
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  insert(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (Object.keys(options).length === 0)
          throw "Expecting set options for inserting";
        options = options.skipusertrack
          ? options
          : this.basicFieldsTemplate(options);
        if (options.skipusertrack) delete options.skipusertrack;
        let query = `INSERT INTO ${this.tableName} SET ?`;
        let query1 = this.dbo.query(query, [options], (err, result) => {
          // this.dbo.release();
          if (err) return reject(err);
          resolve(result);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  bulkInsert(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        if (
          !options.hasOwnProperty("fields") ||
          !options.hasOwnProperty("values")
        ) {
          return reject("Bulk create expects fields and values");
        } else if (!options.hasOwnProperty("fields")) {
          return reject("Bulk create expects fields");
        } else if (!options.hasOwnProperty("values")) {
          return reject("Bulk create expects values");
        }
        let query = `INSERT INTO notifications_users(id,user_id,notification_id,type,status) VALUES ?`;
        console.log(options.values,"options.values")
        let query1 = this.dbo.query(query, options.values, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  update(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        let fields = this.buildQuery(options.fields);
        let whereFields = options.where;
        let data = Object.values(options.fields).concat(
          Object.values(options.whereValue)
        );

        let query = `UPDATE ${this.tableName} SET ${fields} WHERE ${whereFields}`;

        let query1 = this.dbo.query(query, data, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  updateParseFields(fields) {
    let fieldsRet = "";
    for (let i = 0; i < fields.length; i++) {
      if (i == fields.length - 1) {
        fieldsRet += fields[i] + " = ?";
      } else {
        fieldsRet += fields[i] + " = ?, ";
      }
    }
    return fieldsRet;
  }

  updateParseWhere(fields) {
    let fieldsRet = "";
    for (let i = 0; i < fields.length; i++) {
      if (i == fields.length - 1) {
        fieldsRet += fields[i] + " = ?";
      } else {
        fieldsRet += fields[i] + " = ? and ";
      }
    }
    return fieldsRet;
  }

  buildQuery(fieldsVal) {
    let fieldsRet = "";
    let fields = Object.keys(fieldsVal);
    for (let i = 0; i < fields.length; i++) {
      if (i == fields.length - 1) {
        fieldsRet += `${fields[i]} = ?`;
      } else {
        fieldsRet += `${fields[i]} = ?, `;
      }
    }
    return fieldsRet;
  }

  buildPreparedData(options) {
    let list = Object.keys(options.fields).concat(
      Object.keys(options.whereValue)
    );
    let values = Object.values(options.fields).concat(
      Object.values(options.whereValue)
    );
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  }

  delete(options = {}) {
    return new Promise((resolve, reject) => {
      let where = "WHERE 1=1";
      let whereValue = [];
      if (options.hasOwnProperty("where")) where = `WHERE ${options.where}`;
      if (options.hasOwnProperty("whereValue")) whereValue = options.whereValue;
      let query = `DELETE FROM ${this.tableName} ${where}`;
      let query1 = this.dbo.query(query, whereValue, (err, result, fields) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  basicFieldsTemplate(data) {
    return Object.assign(data, {
      createdAt: new Date(),
      updatedAt: new Date(),
      // createdby: "4a328e24-949f-47e2-99d2-61ebbf1c8efb",
      // updatedby: "4a328e24-949f-47e2-99d2-61ebbf1c8efb"
    });
  }

  rawQuery(rawQuery) {
    return new Promise((resolve, rject) => {
      let query1 = this.dbo.query(rawQuery, (err, result) => {
        // this.dbo.release();
        if (err) return reject(err);
        resolve(result);
      });
    });
  }
};
