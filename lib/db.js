'use strict';

var r  = require('rethinkdbdash')({servers:[{host: 'mdbs1-priv', port: 28015}]});

module.exports.findUserByMail = function (mail, callback) {
  r
  .db('mailsender').table('user')
  .getAll(mail, {index: 'email'}).nth(0)
  .run().then(function(result) {
    callback(null, result);
  });
};

module.exports.getLatestMailByDate = function (id, y, m, d, callback) {
  r
  .db('mailsender').table('session')
  //.getAll(id, {index: 'user'})
  .filter(
    r.row('time').year().eq(y)
    .and(r.row('time').month().eq(m))
    .and(r.row('time').day().eq(d))
  )
  .orderBy(r.desc('time'))
  .limit(1)('sid')
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.getMailBySID = function (sid, y, m, d, callback) {
  r
  .db('mailsender').table('session').get(sid)
  .pluck('sid','sender','count','sent','deferred','bounced','time','body','subject')
  .merge(function(doc) {
    return {
      process: doc('sent').add(doc('deferred')).add(doc('bounced')),
      mbody: doc('body').match("(?i)<body[^>]*>((.|[\n\r])*)<\/body>")('groups')(0)('str').default("")
    }
  })
  .without('body')
  .merge(function() {
    return {
      daymail: r
            .db('mailsender').table('session')
            .filter(function(sess) {
              return sess('time').year().eq(y)
                    .and(sess('time').month().eq(m))
                    .and(sess('time').day().eq(d))
            }).pluck('sid','time','subject').orderBy(r.desc('time')).coerceTo('array')
    }
  })
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.getUser = function (id, callback) {
  r
  .db('mailsender').table('user')
  .get(id)
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.getMailArrFromListIDs = function (id, lists, callback) {
  r
  .db('mailsender').table('user')
  .get(id)('list')
  .filter(function(list) {
    return r.expr(lists).contains(list('id'))
  })('members')
  .concatMap(function(arr) {
    return arr
  })
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.saveMailList = function (id, list) {
  r
  .db('mailsender').table('user')
  .get(id)
  .update(function(row) {
    return {
      list: row('list')
      .append(list)
    };
  }).run()
};

module.exports.deleteMailList = function (id, listdel) {
  r
  .db('mailsender').table('user')
  .get(id)
  .update(function(row) {
    return {
      list: row('list').filter(function(list) {
        return list('id').ne(listdel)
      })
    };
  }).run()
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
  });
};

module.exports.getMailDetail = function (id, callback) {
  r
  .db('mailsender').table('mail')
  .get(id).default(null)
  .run().then(function (result) {
    callback(null, result);
  });
};

// SOCKET.IO CURSORS
module.exports.mailStatChanges = function (callback) {
  r
  .db('mailsender').table('session')
  .pluck('sid','sent','deferred','bounced','count')
  .changes().run({cursor:true})
  .then(function(cursor) {
    callback(null, cursor);
  });
};
