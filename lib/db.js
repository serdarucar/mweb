'use strict';

var r  = require('rethinkdbdash')({servers:[{host: 'mdbs1-priv', port: 28015}]}),
    logdebug = require('debug')('rdb:debug'),
    logerror = require('debug')('rdb:error');

module.exports.findIdByMail = function (email, callback) {
  logdebug("[INFO][%s][findIdByMail] Sign Up {email: %s, password: 'you really thought I'd log it?'}", connection._id, email);
  r
  .db('mailsender').table('user')
  .filter({email: email})
  .pluck('id')
  .limit(1)
  .run().then(function(err, row) {
    if (err) {
      logerror("[ERROR][%s][findIdByMail][collect] %s:%s\n%s", connection._id, err.name, err.msg, err.message);
      callback(err);
    } else {
      cursor.next(function (err, row) {
        if(err) {
          if (((err.name === "RqlDriverError") && err.message === "No more rows in the cursor.")) {
            logdebug("[INFO][%s][findIdByMail][MailNotUsedBefore] %s:%s\n%s", connection._id, err.name, err.msg, err.message);
            callback(null, null);
          } else {
            throw err;
          }
        } else {
          callback(null, row);
        }
      });
    }
  });
};

/**
 * Every user document is assigned a unique id when created. Retrieving
 * a document by its id can be done using the
 * [`get`](http://www.rethinkdb.com/api/javascript/get/) function.
 *
 * RethinkDB will use the primary key index to fetch the result.
 *
 * @param {String} userId
 *    The ID of the user to be retrieved.
 *
 * @param {Function} callback
 *    callback invoked after collecting all the results
 *
 * @returns {Object} the user if found, `null` otherwise
 */
module.exports.findUserById = function (userId, callback) {
  r
  .table('users')
  .get(userId)
  .pluck('id','username','password') // pluck not needed, all data pushed to templates. @todo: check for performance
  .run().then(function(err, result) {
    if(err) {
      logerror("[ERROR][%s][findUserById] %s:%s\n%s", err.name, err.msg, err.message);
      callback(null, null);
    } else {
      callback(null, result);
    }
  });
};

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
