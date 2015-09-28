'use strict';

var r  = require('rethinkdbdash')({servers:[{host: 'mdbs1-priv', port: 28015}]}),
    logdebug = require('debug')('rdb:debug'),
    logerror = require('debug')('rdb:error');

module.exports.saveUser = function (user, callback) {
    user['createdAt'] = r.now();
		r.branch(
			r.table('users')
				.getAll(user.email, {index: 'email'})
				.filter({alive: true, exist: true})
				.isEmpty(),
			r.branch(
				r.table('users')
					.getAll(user.username, {index: 'username'})
					.filter({alive: true, exist: true})
					.isEmpty(),
				r.table('users')
					.insert(user),
				{duplicate:1}),
			{duplicate:1})
      .run().then(function(err, result) {
      if(err) {
        logerror("[ERROR][%s][saveUser] %s:%s\n%s", connection._id, err.name, err.msg, err.message);
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
