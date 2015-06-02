/*jslint unparam: true, node: true*/
'use strict';

// app.js
//
require('pmx').init({
  ignore_routes : [/socket\.io/],
  errors        : true,
  custom_probes : true
});

var express = require('express')
  , app = express()
  , io = require('socket.io').listen(app.listen(process.env.PORT || 8888))
  , r  = require('rethinkdbdash')({servers:[{host: '127.0.0.1', port: 28015}]})
  , db = require('./lib/db')
  , exphbs = require('express-handlebars')
  , helpers = require('./lib/helpers')
  , debug = require('debug')('smw.tashimasu.info')
  , path = require('path')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , session = require('express-session')
  , math = require('mathjs')
  , moment = require('moment')
  , pmx = require('pmx')
  , passwordless = require('passwordless')
  , RethinkDBStore = require('passwordless-rethinkdbstore')
  , email   = require('emailjs');

// `ExpressHandlebars` instance creation.
var hbs = exphbs.create({
  defaultLayout: 'default',
  helpers : helpers,
  extname: '.html'
});

// view engine setup
//app.set('layout', path.join(__dirname, 'layouts/default'));
app.engine('html', hbs.engine);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.enable('view cache');

// express application initialize
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// SOCKET.IO EMITTERS
r
.db('mailsender').table('session')
.pluck('sid','sent','deferred','bounced')
.changes().run({cursor:true})
.then(function(cursor) {
  cursor.each(function(err, data) {
    io.sockets.emit("mailstats", data);
  });
});

// PASSWORDLESS TOKEN DELIVERY SETUP
var smtpServer  = email.server.connect({
  host:    '178.62.101.203',
  //host:    '127.0.0.1',
   ssl:     false
});

// PASSWORDLESS INIT
passwordless.init(new RethinkDBStore({host: '127.0.0.1', port: 28015, db: 'mailsender'}));

// PASSWORDLESS TOKEN DELIVERY SERVICE
passwordless.addDelivery(
  function(tokenToSend, uidToSend, recipient, callback) {
    var host = 'tashimasu.net:8888';
    //var host = 'localhost:8888';
    smtpServer.send({
      text:    'Hello!\nAccess your account here: http://'
      + host + '?token=' + tokenToSend + '&uid='
      + encodeURIComponent(uidToSend),
      from:    'nobody@tashimasu.net',
      to:      recipient,
      subject: 'Token for ' + host
  }, function(err, message) {
    if(err) {
        console.log(err);
    }
    callback(err);
  });
});

// PASSWORDLESS ACCEPT / SESSION
app.use(session({ secret: 'janalicibaqishlary', resave: true, saveUninitialized: true })); // session secret
app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken({ successRedirect: '/', enableOriginRedirect: true }));

// PASSWORDLESS ROUTES
/* GET login screen. */
app.get('/login', function(req, res) {
   res.render('login');
});

/* Logout and redirect to root. */
app.get('/logout', passwordless.logout(),
  function(req, res) {
    res.redirect('/login');
});

app.post('/sendtoken',
    passwordless.requestToken(
        // Turn the email address into an user ID
        function(user, delivery, callback, req) {
          // usually you would want something like:
          db.findUserByMail(user, function (err, result) {
             if(result) {
                return callback(null, result.id);
                }
             else
                return callback(null, null);
          })
          // but you could also do the following
          // if you want to allow anyone:
          // callback(null, user);
        }, { originField: 'origin' }),
    function(req, res) {
       // success!
          res.render('sent');
});

// EXPRESS ROUTES
app.get('/', function (req, res) {
  res.redirect(moment().format('/YYYY/MM/DD'));
});

app.get('/list',

  passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
  }),

  function (req, res) {

  db.getUsersLists(req.user, function (err, result) {
    res.render('list', {
      list: JSON.stringify(result),
      user: req.user
    });
  });

});

app.get('/new',

  passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
  }),

  function (req, res) {
  res.render('new', {user: req.user});
});

app.get('/session/:sid/:lim',

  passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
  }),

  function (req, res) {

  var s_sid = req.params.sid;
  var n_lim = parseInt(req.params.lim);
  var n_lim_next = n_lim * 10;

  db.getSessionMails(s_sid, n_lim, function (err, result) {
    res.render('session', {
      result: result,
      sid: s_sid,
      aft_lim: n_lim_next,
      user: req.user
    });
  });

});

app.get('/detail/:qid/:addr',

  passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
  }),

  function (req, res) {

  var s_uid = req.params.qid + '/' + req.params.addr;

  db.getMailDetail(s_uid, function (err, result) {
    res.render('log', {
      result: result,
      user: req.user
    });
  });

});

app.get('/:y/:m/:d',

  passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
  }),

  function (req, res) {

  var year  = parseInt(req.params.y);
  var month = parseInt(req.params.m);
  var day   = parseInt(req.params.d);
  var today = moment(year + '-' + month + '-' + day, 'YYYY-MM-DD');

  db.getMailIndex(req.user, year, month, day, function (err, result) {
    res.render('index', {
      result: result,
      date: today,
      user: req.user
    });
  });

});

app.use(pmx.expressErrorHandler());
