'use strict';

var r  = require('rethinkdbdash')({servers:[{host: process.env.RDB_HOST || 'mdbs1-priv', port: parseInt(process.env.RDB_HOST) || 28015}]}),
    rdb = require('rethinkdb'),
    util = require('util'),
    assert = require('assert'),
    logdebug = require('debug')('rdb:debug'),
    logerror = require('debug')('rdb:error');

// #### Connection details

// RethinkDB database settings. Defaults can be overridden using environment variables.
var dbConfig = {
  host: process.env.RDB_HOST || 'mdbs1-priv',
  port: parseInt(process.env.RDB_PORT) || 28015,
  db  : process.env.RDB_DB || 'mailsender'
};


// module.exports.findIdByMail = function (email, callback) {
//   logdebug("[INFO][%s][findIdByMail] Sign Up {email: %s, password: 'you really thought I'd log it?'}", connection._id, email);
//   r
//   .db('mailsender').table('user')
//   .filter({email: email})
//   .pluck('id')
//   .limit(1)
//   .run().then(function(err, row) {
//     if (err) {
//       logerror("[ERROR][%s][findIdByMail][collect] %s:%s\n%s", connection._id, err.name, err.msg, err.message);
//       callback(err);
//     } else {
//       cursor.next(function (err, row) {
//         if(err) {
//           if (((err.name === "RqlDriverError") && err.message === "No more rows in the cursor.")) {
//             logdebug("[INFO][%s][findIdByMail][MailNotUsedBefore] %s:%s\n%s", connection._id, err.name, err.msg, err.message);
//             callback(null, null);
//           } else {
//             throw err;
//           }
//         } else {
//           callback(null, row);
//         }
//       });
//     }
//   });
// };

module.exports.findUserById = function (userId, callback) {
  onConnect(function (err, connection) {
    rdb.db(dbConfig['db']).table('user').get(userId).run(connection, function(err, result) {
      if(err) {
        logerror("[ERROR][%s][findUserById] %s:%s\n%s", connection['_id'], err.name, err.msg, err.message);
        callback(null, null);
      }
      else {
        callback(null, result);
      }
      connection.close();
    });
  });
};

module.exports.findUserByEmail = function (mail, callback) {
  onConnect(function (err, connection) {
    logdebug("[INFO ][%s][findUserByEmail] Login {user: %s, pwd: 'you really thought I'd log it?'}", connection['_id'], mail);
    rdb.db(dbConfig['db']).table('user').filter({'email': mail}).limit(1).run(connection, function(err, cursor) {
      if(err) {
        logerror("[ERROR][%s][findUserByEmail][collect] %s:%s\n%s", connection['_id'], err.name, err.msg, err.message);
        callback(err);
      }
      else {
        cursor.next(function (err, row) {
          if(err) {
            if (((err.name === "ReqlDriverError") && err.message === "No more rows in the cursor.")) {
              callback(null, null);
            }
            else {
              logerror("[ERROR][%s][findUserByEmail][collect] %s:%s\n%s", connection['_id'], err.name, err.msg, err.message);
              callback(err);
            }
          }
          else {
            callback(null, row);
          }
          connection.close();
        });
      }
    });
  });
};

module.exports.saveUser = function (user, callback) {
  user['createdAt'] = r.now();
  user['list'] = [];
  user['plan'] = 99;
  user['active'] = true;
  r.branch(
    r.db('mailsender').table('user')
      .filter({'email': user.email})
      .isEmpty(),
      r.db('mailsender').table('user')
        .insert(user), {duplicate:1})
  .run().then(function(result) {
    if (result.inserted === 1) {
      callback(null, true);
    }
    else {
      callback(null, false);
    }
  });
};

module.exports.getLatestMail = function (id, callback) {
  r
  .db('mailsender').table('session')
  .getAll(id, {index: 'owner'})
  .orderBy(r.desc('time'))
  .limit(1)('sid')
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.getLatestMailByDate = function (id, y, m, d, callback) {
  r
  .db('mailsender').table('session')
  .getAll(id, {index: 'owner'})
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

module.exports.getMailBySI = function (sid, uid, y, m, d, callback) {
  r
  .db('mailsender').table('session').get(sid) // @todo: full path url working externally, put user control here
  .pluck('sid','sender','count','sent','deferred','bounced','time','body','subject','rcpt')
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
            .getAll(uid, {index: 'owner'})
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

module.exports.getMailBySID = function (sid, callback) {
  r
  .db('mailsender').table('session').get(sid)
  .pluck('sid','sender','count','sent','deferred','bounced','time','body','subject','rcpt')
  .merge(function(doc) {
    return {
      process: doc('sent').add(doc('deferred')).add(doc('bounced')),
      mbody: doc('body').match("(?i)<body[^>]*>((.|[\n\r])*)<\/body>")('groups')(0)('str').default("")
    }
  })
  .without('body')
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

module.exports.getUsersActiveLists = function (id, callback) {
  r
  .db('mailsender').table('list')
  .filter({user:id, active: true})
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.getMailArraysFromListIDs = function (lists, callback) {

  r
  .db('mailsender').table('list')
  .getAll(r.args(lists))('members')
  .concatMap(function(arr) {
    return arr
  })
  .run().then(function (result) {
    callback(null, result);
  });
};

module.exports.saveMailList2 = function (id, list) {

  list['user'] = id;
  list['active'] = true;
  list['createdAt'] = r.now();

  r
  .db('mailsender').table('list')
  .insert(list).run()
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


// #### Helper functions

/**
 * A wrapper function for the RethinkDB API `r.connect`
 * to keep the configuration details in a single function
 * and fail fast in case of a connection error.
 */
function onConnect(callback) {
  rdb.connect({host: dbConfig.host, port: dbConfig.port }, function(err, connection) {
    assert.ok(err === null, err);
    connection['_id'] = Math.floor(Math.random()*10001);
    callback(err, connection);
  });
}
