/* Filename: dbcon.js
 * Authors: Isaac Neibaur, Johannes Pikel, Berry Semexan, Akshay Subramanian, Ivan Xa
 * Date: 2017.06.09
 * Class: CS361-400
 * Assignment: Project B
 * Description: creates the connection pool to the mysql server
 * */



var mysql = require('mysql');

var pool = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  port            : '3306',
  user            : 'pikelj',
  password        : 'cs361_group7_Long#',
  database        : 'c9'
});

module.exports.pool = pool;
