'use strict'
const mysql = require('mysql');

const connect = (config) => {
    return new Promise((resolve, reject) => {
        try {
            const connection = mysql.createPool({
                connectionLimit : config.connectionLimit,
                host: config.server,
                user: config.username,
                password: config.password,
                database: config.dbName,
                debug: config.logging
                // timezone: config.TIMEZONE,
            })
            resolve(connection);
        } catch(e) {
            reject(e)
        }
    })
}

module.exports = Object.assign({},{connect});
