/*jslint unparam: true, node: true*/
// app.js
// 
require('pmx').init({
  ignore_routes : [/socket\.io/],
  errors        : true,
  custom_probes : true
});

var express = require('express')
  , app = express()
  , io = require('socket.io').listen(app.listen(process.env.PORT || 80))
  , r  = require('rethinkdbdash')({servers:[{host: '127.0.0.1', port: 28015}]})
  , debug = require('debug')('smw.tashimasu.info')
  , path = require('path')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , session = require('express-session')
  , math = require('mathjs')
  , pmx = require('pmx')
  , passwordless = require('passwordless')
  , RethinkDBStore = require('passwordless-rethinkdbstore')
  , email   = require("emailjs");

// view engine setup
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', path.join(__dirname, 'layouts/default'));
app.engine('html', require('hogan-express'));
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
   ssl:     false
});

// PASSWORDLESS INIT
passwordless.init(new RethinkDBStore({host: '127.0.0.1', port: 28015, db: 'mailsender'}));

// PASSWORDLESS TOKEN DELIVERY SERVICE
passwordless.addDelivery(
  function(tokenToSend, uidToSend, recipient, callback) {
    var host = 'tashimasu.net';
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

/* Static users for now. */
var users = [
    { id: 1, email: 'serdarn@me.com' },
    { id: 2, email: 'sio@doruk.net.tr' },
    { id: 3, email: 'slmkrnz@gmail.com' }
];

/* POST login details. */
app.post('/sendtoken', 
  passwordless.requestToken(
    function(user, delivery, callback) {
      for (var i = users.length - 1; i >= 0; i--) {
        if(users[i].email === user.toLowerCase()) {
          return callback(null, users[i].id);
        }
      }
      callback(null, null);
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

app.get('/list', passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
}), function (req, res) {
  res.render('list');
});

app.get('/new', passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
}), function (req, res) {
  res.render('new');
});

app.get('/session/:sid/:lim', passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
}), function (req, res) {

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
    res.render('session', { result: result, sid: s_sid, aft_lim: n_lim_next });
  })

});

app.get('/detail/:qid/:addr', passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
}), function (req, res) {

  var s_qid = req.params.qid;
  var s_addr = req.params.addr;
  var s_uid = s_qid + '/' + s_addr;

  r
  .db('mailsender').table('mail')
  .get(s_uid).default(null)
  .run().then(function (result) {
    res.render('log', { result: result });
  })

});

app.get('/:y/:m/:d', passwordless.restricted({
  originField: 'origin',
  failureRedirect: '/login'
}), function (req, res) {
  
  var n_tod_year  = parseInt(req.params.y);
  var n_tod_month = parseInt(req.params.m);
  var n_tod_day   = parseInt(req.params.d);
  var s_tod_date  = n_tod_day + '.' + n_tod_month + '.' + n_tod_year;

  var today = new Date(n_tod_year, n_tod_month-1, n_tod_day);

  tomorrow.setDate(today.getDate()+1);
  yesterday.setDate(today.getDate()-1);

  console.log('today');
  console.log(today);
  console.log('tomorrow');
  console.log(tomorrow);
  console.log('yesterday');
  console.log(yesterday);

  var d_tom_year = tomorrow.getUTCFullYear();
  var d_tom_month = tomorrow.getUTCMonth() + 1;
  var d_tom_day = tomorrow.getUTCDate();

  var d_yes_year = yesterday.getUTCFullYear();
  var d_yes_month = yesterday.getUTCMonth() + 1;
  var d_yes_day = yesterday.getUTCDate();

  r
  .db('mailsender').table('session')
  .filter(
    r.row('time').during(
      r.time(n_tod_year, n_tod_month, n_tod_day, '+03'),
      r.time(d_tom_year, d_tom_month, d_tom_day, '+03')
    )
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
      date: s_tod_date,
      yesterday: {
        year: d_yes_year,
        month: d_yes_month,
        day: d_yes_day
      },
      tomorrow: {
        year: d_tom_year,
        month: d_tom_month,
        day: d_tom_day
      }
    });
  })

});

app.use(pmx.expressErrorHandler());

//app.set('port', process.env.PORT || 3300);

//app.listen(app.get('port'));
