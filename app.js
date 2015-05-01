/*jslint unparam: true, node: true*/
// app.js

var express = require('express')
  , app = express()
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

app.get('/u', function (req, res) {
  var timeFilter = new Date();
  timeFilter.setDate(timeFilter.getDate()-1);
  r.db('mailsender').table('session')
    .filter(function(session) {
      return session('time').gt(timeFilter)
    })
    .without('mail')
    .coerceTo('array')
    .orderBy(r.desc('time'))
    .run().then(function (result) {
      res.render('index', { result: result });
    })
});

app.get('/s/:sid', function (req, res) {
  var s_sid = req.params.sid;
  r.db('mailsender').table('session')
    .get(s_sid)('mail')
    .eqJoin(function(uid) {
      return uid;
    }, r.table('mail')).zip()
    .group('status').count()
    .ungroup().map(function(doc) {
      return {
        status: doc('group'),
        count: doc('reduction')
      }
    }).orderBy(r.desc('status'))
      .run().then(function (result) {
        res.render('session', { result: result, sid: s_sid });
    })
});

app.get('/m/:sid/:st/:idx', function (req, res) {
  var s_sid = req.params.sid;
  var s_st = req.params.st;
  var n_idx = parseInt(req.params.idx);
  var n_idx1 = math.subtract(n_idx, 50);
  var n_idx2 = math.add(n_idx, 50);
  r.db('mailsender').table("session")
    .get(s_sid)('mail')
    .filter({st: s_st})
    .pluck('addr').orderBy('addr')
    .slice(n_idx, n_idx2)
  .run().then(function (result) {
    res.render('mails', {
      result: result,
      sid: s_sid,
      st: s_st,
      idx: n_idx,
      idx1: n_idx1,
      idx2: n_idx2
    });
  })
});

app.set('port', process.env.PORT || 3300);

app.listen(app.get('port'));
