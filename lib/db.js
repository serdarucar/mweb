'use strict';

var r  = require('rethinkdbdash')({servers:[{host: '127.0.0.1', port: 28015}]});

module.exports.getUsersLists = function (id, callback) {
  r
  .db('mailsender').table('user')
  .get(id)
  .run().then(function (result) {
    callback(null, result);
  });
};
