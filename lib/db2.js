'use strict';

var r  = require('rethinkdbdash')({servers:[{host: 'mdbs1-priv', port: 28015}]}),
    logdebug = require('debug')('rdb:debug'),
    logerror = require('debug')('rdb:error');

module.exports.saveUser = function (user, callback) {
    user['createdAt'] = r.now();
		r.branch(
			r.db('mailsender').table('user')
				.getAll(user.email, {index: 'email'})
				.isEmpty(),
				r.db('mailsender').table('user')
					.insert(user),
			{duplicate:1})
      .run().then(function(err, result) {
      if(err) {
        logerror("[ERROR][%s][saveUser] %s:%s\n%s", err.name, err.msg, err.message);
        callback(err);
      }
      else {
        if (result.inserted === 1) {
          callback(null, true);
        }
        else {
          callback(null, false);
        }
      }
    });
};
