'use strict';

require('pmx').init({
  ignore_routes: [/socket\.io/],
  errors: true,
  custom_probes: true
});

var express = require('express'),
  app = express(),
  io = require('socket.io').listen(app.listen(process.env.PORT || 8888)),
  r = require('rethinkdb'),
  async = require('async'),
  db = require('./lib/db'),
  exphbs = require('express-handlebars'),
  helpers = require('./lib/helpers'),
  debug = require('debug')('smw.tashimasu.info'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  session = require('express-session'),
  passport = require('passport'),
  local = require('passport-local').Strategy,
  flash = require('connect-flash'),
  bcrypt = require('bcryptjs'),
  math = require('mathjs'),
  moment = require('moment'),
  shortid = require('shortid'),
  request = require('request-json'),
  pmx = require('pmx');

var config = require(__dirname + '/config.js');

// `ExpressHandlebars` instance creation.
var hbs = exphbs.create({
  defaultLayout: 'default',
  helpers: helpers,
  extname: '.html'
});

// request-json client creation
var client = request.createClient('http://localhost:11111/');

// view engine setup
app.engine('html', hbs.engine);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.enable('view cache');

// express application initialize
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(methodOverride());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// passport initialization
app.use(session({ secret: 'janalicibaqishlary', resave: true, saveUninitialized: true })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // make login sessions persistent
app.use(flash()); // connect-flash messages

// SOCKET.IO EMITTERS
db.mailStatChanges(function(err, cursor) {
  cursor.each(function(err, data) {
    io.sockets.emit("mailstats", data);
  });
});

// MIDDLEWARE (get user)
/*
app.use(function(req, res, next) {
  db.getUser('b95eeb70-4768-4720-8b41-af15ea6ed0c3', function(err, user) {
    req.user = user;
    next();
  });
});
*/

/*
app.use(function(req, res, next) {
  if (typeof req.user !== 'undefined') {
    next();
  } else {
    res.render('landing');
  }
});
*/

// PASSPORT INTEGRATION START
//
//

passport.use(new local(
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      var validateUser = function (err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, {message: 'Unknown user: ' + username})}
        if (bcrypt.compareSync(password, user.password)) {
          return done(null, user);
        }
        else {
          return done(null, false, {message: 'Invalid password'});
        }
      };

      db.findUserByEmail(username, validateUser);
    });
  }
));

passport.serializeUser(function(user, done) {
  console.log("[DEBUG][passport][serializeUser] %j", user.id);
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  db.findUserById(id, done);
});

//
//
// PASSPORT INTEGRATION END

// EXPRESS ROUTES
app.get('/', function(req, res) {
  if (typeof req.user !== 'undefined') {
    // User is logged in.
    db.getLatestMail(req.user.id, function (err, result) {
      res.redirect('/' + result);
    });
  }
  else {
    var message = req.flash('error');
    if (message.length < 1) {
      message = false;
    }
    res.redirect('/login.html');
  }
});

// process the login form
app.post('/', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/', failureFlash: true }));

app.get('/logout', function(req, res) { req.logout(); res.redirect('/'); });

app.get('/admin', function (req, res) {
  if (typeof req.user === 'undefined') {
    res.redirect('/');
  } else if (req.user.admin !== true) {
    res.redirect('/');
  } else {
    var message = req.flash('error');
    if (message.length < 1) {
      message = false;
    }
  res.render('admin', { message: message, user: req.user });
  }
});

// process the signup form
app.post('/admin', function(req, res){
  if (!validateEmail(req.body.email)) {
    // Probably not a good email address.
    req.flash('error', 'Not a valid email address!');
    res.redirect('/admin');
    return;
  }
  if (req.body.password !== req.body.password2) {
    // 2 different passwords!
    req.flash('error', 'Passwords does not match!');
    res.redirect('/admin');
    return;
  }

  var user = {
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8)
  };

	db.saveUser(user, function(err, saved) {
    console.log("[DEBUG][/signup][saveUser] %s", saved);
    if(err) {
      console.log(err);
      req.flash('error', 'There was an error creating the account. Please try again later');
      res.redirect('/admin');
    }
    if(saved) {
      req.flash('info', 'Account Created.');
      console.log("[DEBUG][/signup][saveUser] User Registered");
      res.redirect('/admin');
    }
    else {
      req.flash('error', 'The account wasn\'t created');
      console.log("[DEBUG][/signup][saveUser] Unknown problem on creating account");
      res.redirect('/admin');
    }
  });
});

app.get('/new', function (req, res) {
  if (typeof req.user === 'undefined') {
    res.redirect('/');
  } else {
    db.getUsersActiveLists(req.user.id, function (err, result) {
      res.render('new', { lists: result, user: req.user });
    })
  }
});

app.post('/mailsender', function(req, res) {

  var prebody = "<html><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'></head><body>";
  var postbody = "</body></html>";
  var body = prebody + req.body.body + postbody;

  db.getMailArraysFromListIDs(req.body.recipients, function(err, result) {

    var maildata = {
      fromaddr: req.user.email,
      owner: req.user.id,
      list: req.body.listnames,
      toaddr: result,
      mailsubject: req.body.subject,
      mailbody: body
    };

    client.post('rmail', maildata, function(err, res, body) {
      return console.log(res.statusCode);
    });

  });

});

app.get('/lists', function (req, res) {
  if (typeof req.user === 'undefined') {
    res.redirect('/');
  } else {
    res.render('listen', { user: req.user });
  }
    //  res.render('listen', { user: req.user });
});

app.get('/list', function (req, res) {
  if (typeof req.user === 'undefined') {
    res.redirect('/');
  } else {
    res.render('list', { user: req.user });
  }
});

app.get('/list2', function (req, res) {
  if (typeof req.user === 'undefined') {
    res.redirect('/');
  } else {
    res.render('list2', { user: req.user });
  }
});

app.post('/savelist', function(req, res) {

  var newlist = {
    id: shortid.generate(),
    name: req.body.listname,
    members: req.body.listdata,
    count: req.body.listcount
  }

  db.saveMailList(req.user.id, newlist);

});

app.post('/savelist2', function(req, res) {

  var newlist = {
    name: req.body.listname,
    members: req.body.listdata,
    count: req.body.listcount
  }

  db.saveMailList2(req.user.id, newlist);

});

app.post('/updatelist', function(req, res) {

  var updlist = {
    id: shortid.generate(),
    name: req.body.listname,
    members: req.body.listdata,
    count: req.body.listcount
  }

  db.saveMailList(req.user.id, updlist);
  db.deleteMailList(req.user.id, req.body.listdelid);

});

app.post('/deletelist', function(req, res) {

  req.body.listdelete.forEach(function(listid) {
    db.deleteMailList(req.user.id, listid);
  });

});

app.post('/deletelast', function(req, res) {

    db.deleteMailList(req.user.id, req.body.listdelid);

});

// app.get('/:date', function(req, res) { //@todo: not logged in user is looping here on a date (not anymore with user control; ensureAuthenticated caused this. investigate.)
//   if (typeof req.user === 'undefined') {
//     res.redirect('/');
//   } else {
//     var m = moment(req.params.date, 'YYYYMMDD');
//
//     var year = parseInt(req.params.date.substring(0, 4));
//     var month = parseInt(req.params.date.substring(4, 6));
//     var day = parseInt(req.params.date.substring(6, 8));
//
//     if (m.isValid()) {
//       db.getLatestMailByDate(req.user.id, year, month, day, function(err, result) {
//         if (result.length > 0) {
//           res.redirect('/' + req.params.date + '/' + result);
//         } else {
//           res.render('index', { nomail: true, date: moment(req.params.date, "YYYYMMDD"), user: req.user });
//         }
//       });
//     } else {
//       res.render('/', { url: req.url, title: 'Page Not Found', user: req.user });
//     }
//   }
// });

app.get('/:sid', function(req, res) {
  if (typeof req.user === 'undefined') {
    res.redirect('/');
  } else {
    db.getMailBySID(req.params.sid, function(err, result) {
      if (result) {
        res.render('index', {
          result: result,
          date: result.time,
          user: req.user
        });
      } else {
        res.redirect('/');
      }
    });
  }
});

//The REST routes for "list".
app.route('/api/rest/session')
  .get(allUserSessions);

app.route('/api/rest/list')
  .get(allListItems)
  .post(createListItem);

app.route('/api/rest/list/:id')
  .get(getListItem)
  .put(updateListItem)
  .delete(deleteListItem);

app.route('/api/rest/trash')
  .put(recycleListMember);

//If we reach this middleware the route could not be handled and must be unknown.
app.use(handle404);

//Generic error handling middleware.
app.use(handleError);

/*
 * Get a sessions of a user.
 */
function allUserSessions(req, res, next) {

  if (typeof req.user === 'undefined') {
    res.render('404', { url: req.url });
  } else {
    r.table('session').getAll(req.user.id, {index: 'owner'}).orderBy(r.desc('time')).run(req.app._rdbConn, function(err, result) {
      if(err) {
        return next(err);
      }

      res.json(result);
    });
  }
}

/*
 * Retrieve all list items.
 */
function allListItems(req, res, next) {

  if (typeof req.user === 'undefined') {
    res.render('404', { url: req.url });
  } else {
    r.table('list').orderBy({index: r.desc('createdAt')}).filter({user: req.user.id, active: true}).run(req.app._rdbConn, function(err, cursor) {
      if(err) {
        return next(err);
      }

      //Retrieve all the lists in an array.
      cursor.toArray(function(err, result) {
        if(err) {
          return next(err);
        }

        res.json(result);
      });
    });
  }
}

/*
 * Delete a list item.
 */
function deleteListItem(req, res, next) {
  var listItemID = req.params.id;

  if (typeof req.user === 'undefined') {
    res.render('404', { url: req.url });
  } else {
    r.table('list').get(listItemID).update({active: false}).run(req.app._rdbConn, function(err, result) {
      if(err) {
        return next(err);
      }

      res.json({success: true});
    });
  }
}

/*
 * Insert a new list item.
 */
function createListItem(req, res, next) {

  var listItem = {
    active: true,
    user: req.user.id,
    createdAt : r.now(),
    name: req.body.listname,
    members: req.body.listdata,
    count: req.body.listcount
  }

  r.table('list').insert(listItem, {returnChanges: true}).run(req.app._rdbConn, function(err, result) {
    if(err) {
      return next(err);
    }

    res.json(result.changes[0].new_val);
  });
}

/*
 * Get a specific list item.
 */
function getListItem(req, res, next) {
  var listItemID = req.params.id;

  if (typeof req.user === 'undefined') {
    res.render('404', { url: req.url });
  } else {
    r.table('list').get(listItemID).run(req.app._rdbConn, function(err, result) {
      if(err) {
        return next(err);
      }

      res.json(result);
    });
  }
}

/*
 * Update a list member.
 */
function updateListItem(req, res, next) {
  var listMembers = req.body;
  var listItemID = req.params.id;

  if (typeof req.user === 'undefined') {
    res.render('404', { url: req.url });
  } else {
    r.db('mailsender').table('list').get(listItemID)
      .update(function () {
        return { members: listMembers }
      }, {returnChanges: true}).run(req.app._rdbConn, function(err, result) {
      if(err) {
        return next(err);
      }

      res.json(result.changes[0].new_val);
    });
  }
}

/*
 * Trash a list item.
 */
function recycleListMember(req, res, next) {

  var trash = req.body;
  trash['timestamp'] = r.now();

  if (typeof req.user === 'undefined') {
    res.render('404', { url: req.url });
  } else {
    r.table('trash').insert(trash).run(req.app._rdbConn, function(err, result) {
      if(err) {
        return next(err);
      }

      res.json({success: true});
    });
  }
}

/*
 * Page-not-found middleware.
 */
function handle404(req, res, next) {
  res.status(404).end('not found');
}

/*
 * Generic error handling middleware.
 * Send back a 500 page and log the error to the console.
 */
function handleError(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({err: err.message});
}

/*
 * Store the db connection and start listening on a port.
 */
function startDB(connection) {
  app._rdbConn = connection;
}

/*
 * Connect to rethinkdb, create the needed tables/indexes and then start express.
 * Create tables/indexes then start express
 */
async.waterfall([
  function connect(callback) {
    r.connect(config.rethinkdb, callback);
  }], function(err, connection) {
  if(err) {
    console.error(err);
    process.exit(1);
    return;
  }

  startDB(connection);
});

// app.get('/session/:sid/:lim', function(req, res) {
//
//   var s_sid = req.params.sid;
//   var n_lim = parseInt(req.params.lim);
//   var n_lim_next = n_lim * 10;
//
//   db.getSessionMails(s_sid, n_lim, function(err, result) {
//     if (result) {
//       res.render('session', {
//         result: result,
//         sid: s_sid,
//         aft_lim: n_lim_next,
//         user: req.user
//       });
//     } else {
//       res.render('404', { url: req.url, title: 'Page Not Found', user: req.user });
//     }
//   });
//
// });
//
// app.get('/detail/:qid/:addr', function(req, res) {
//
//   var s_uid = req.params.qid + '/' + req.params.addr;
//
//   db.getMailDetail(s_uid, function(err, result) {
//     if (result) {
//       res.render('log', {
//         result: result,
//         user: req.user
//       });
//     } else {
//       res.render('404', { url: req.url, title: 'Page Not Found', user: req.user });
//     }
//   });
//
// });

app.use(function (req, res, next) {
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url, title: 'Page Not Found', user: req.user });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});

/// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', { message: err.message, error: err, title: 'Fatal Error', user: req.user });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', { message: err.message, error: {}, title: 'Page Error', user: req.user });
});

function ensureAuthenticated(req, res, next) {
  //return next();
  if (req.isAuthenticated()) { return next(); }
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

app.use(pmx.expressErrorHandler());
