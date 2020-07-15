const mysql = require("mysql");

const config = require("../config");

const mysqlPool = (() => {
  const pool = mysql.createPool({
    connectionLimit: 100,
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });

  const getConnection = function(callback) {
    pool.getConnection(callback);
  };

  return {
    getConnection: getConnection
  };
})();

if (exports) {
  module.exports = mysqlPool;
}
