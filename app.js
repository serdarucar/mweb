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
  , io = require('socket.io').listen(app.listen(process.env.PORT || 8080))
  , r  = require('rethinkdbdash')({servers:[{host: '127.0.0.1', port: 28015}]})
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
            r
            .db('mailsender').table('user')
            .getAll(user, {index: 'email'}).nth(0)
            .run().then(function(ret) {
               if(ret) {
                  return callback(null, ret.id);
                  }
               else
                  return callback(null, null)
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
  res.redirect('/today');
});

app.get('/today', function (req, res) {
  var dateObj = new Date();
  var year    = dateObj.getUTCFullYear();
  var month   = dateObj.getUTCMonth() + 1;
  var day     = dateObj.getUTCDate();
  res.redirect('/' + year + '/' + month + '/' + day);
});

app.get('/list',

  passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
  }),

  function (req, res) {

  r
  .db('mailsender').table('user')
  .get(req.user)
  .run().then(function (result) {
    res.render('list', {
      list: JSON.stringify(result),
      user: req.user
    });
  })
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

  r
  .db('mailsender').table('mail')
  .getAll(s_sid, {index: 'sid'})
  .hasFields('status')
  .group('status')
  .pluck('to','uid')
  .limit(n_lim).orderBy('time')
  .ungroup().map(function (doc) {
    return r.object(doc('group'), doc('reduction'));
  }).default([{sent: [], deferred: [], bounced: []}])
  .reduce(function (left, right) {
    return left.merge(right);
  }).default(null)
  .run().then(function (result) {
    res.render('session', {
      result: result,
      sid: s_sid,
      aft_lim: n_lim_next,
      user: req.user
    });
  })

});

app.get('/detail/:qid/:addr',

  passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
  }),

  function (req, res) {

  var s_qid = req.params.qid;
  var s_addr = req.params.addr;
  var s_uid = s_qid + '/' + s_addr;

  r
  .db('mailsender').table('mail')
  .get(s_uid).default(null)
  .run().then(function (result) {
    res.render('log', {
      result: result,
      user: req.user
    });
  })

});

app.get('/:y/:m/:d',

  passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
  }),

  function (req, res) {

  var n_tod_year  = parseInt(req.params.y);
  var n_tod_month = parseInt(req.params.m);
  var n_tod_day   = parseInt(req.params.d);

  r
  .db('mailsender').table('session')
  //.getAll(req.user, {index: 'user'})
  .filter(
    r.row('time').year().eq(n_tod_year)
    .and(r.row('time').month().eq(n_tod_month))
    .and(r.row('time').day().eq(n_tod_day))
  )
  .orderBy(r.desc('time'))
  .pluck('sid','sender','count','sent','deferred','bounced','time')
  .merge(function(doc) {
    return {
      hh: r.branch(
        doc('time').inTimezone('+03:00').hours().gt(9),
        doc('time').inTimezone('+03:00').hours().coerceTo('string'),
        r.expr('0').add(doc('time').inTimezone('+03:00').hours().coerceTo('string'))
      ),
      mi: r.branch(
        doc('time').minutes().gt(9),
        doc('time').minutes().coerceTo('string'),
        r.expr('0').add(doc('time').minutes().coerceTo('string'))
      ),
      process: doc('sent').add(doc('deferred')).add(doc('bounced'))
    };
  })
  .run().then(function (result) {
    res.render('index', {
      result: result,
      date: dateObj,
      user: req.user
    });
  })

});

app.use(pmx.expressErrorHandler());

//app.set('port', process.env.PORT || 3300);

//app.listen(app.get('port'));
