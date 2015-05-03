/*jslint unparam: true, node: true*/
// app.js

var express = require('express')
  , app = express()
  , io = require('socket.io').listen(app.listen(3300))
  , r  = require('rethinkdbdash')(/*{
      servers: [
        {host: '10.131.166.209', port: 28015},
        {host: '10.131.166.209', port: 28016},
        {host: '10.131.166.238', port: 28015},
        {host: '10.131.166.238', port: 28016}
      ],
      buffer: 500,
      max: 5000
    }*/)
  , debug = require('debug')('smw.tashimasu.info')
  , path = require('path')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , math = require('mathjs');

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
.changes().run()
.then(function(cursor) {
  cursor.each(function(err, data) {
    io.sockets.emit("mailstats", data);
  });
});

// EXPRESS ROUTES
app.get('/u', function (req, res) {
  
  var timeFilter = new Date();
  timeFilter.setDate(timeFilter.getDate()-1);

  r
  .db('mailsender').table('session')
  .filter(function(session) {
    return session('time').gt(timeFilter)
  })
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
    res.render('index', { result: result });
  })

});

app.get('/list', function (req, res) {
  res.render('list');
});

app.get('/new', function (req, res) {
  res.render('new');
});

app.get('/s/:sid/:lim', function (req, res) {

  var s_sid = req.params.sid;
  var n_lim = parseInt(req.params.lim);
  var n_lim_next = n_lim * 10;

  r
  .db('mailsender').table('mail')
  .getAll(s_sid, {index: 'sid'})
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

app.get('/d/:qid/:addr', function (req, res) {

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

//app.set('port', process.env.PORT || 3300);

//app.listen(app.get('port'));
