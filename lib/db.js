'use strict';

var r  = require('rethinkdbdash')({servers:[{host: '127.0.0.1', port: 28015}]});

module.exports.findUserByMail = function (mail, callback) {
  r
  .db('mailsender').table('user')
  .getAll(mail, {index: 'email'}).nth(0)
  .run().then(function(result) {
    callback(null, result);
  });
};

module.exports.getMailIndex = function (id, y, m, d, callback) {
  r
  .db('mailsender').table('session')
  //.getAll(id, {index: 'user'})
  .filter(
    r.row('time').year().eq(y)
    .and(r.row('time').month().eq(m))
    .and(r.row('time').day().eq(d))
  )
  .orderBy(r.desc('time'))
  .pluck('sid','sender','count','sent','deferred','bounced','time')
  .merge(function(doc) {
    return {
      process: doc('sent').add(doc('deferred')).add(doc('bounced'))
    }
  })
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.getUsersLists = function (id, callback) {
  r
  .db('mailsender').table('user')
  .get(id)
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.getSessionMails = function (id, limit, callback) {
  r
  .db('mailsender').table('mail')
  .getAll(id, {index: 'sid'})
  .hasFields('status')
  .group('status')
  .pluck('to','uid')
  .limit(limit).orderBy('time')
  .ungroup().map(function (doc) {
    return r.object(doc('group'), doc('reduction'));
  }).default([{sent: [], deferred: [], bounced: []}])
  .reduce(function (left, right) {
    return left.merge(right);
  }).default(null)
  .run().then(function (result) {
    callback(null, result);
  })
};

module.exports.getMailDetail = function (id, callback) {
  r
  .db('mailsender').table('mail')
  .get(id).default(null)
  .run().then(function (result) {
    callback(null, result);
  });
};
