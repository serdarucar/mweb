/*jslint unparam: true, node: true*/
// app.js

var express = require('express')
  , app = express()
  , r = require('rethinkdb')
  , debug = require('debug')('smw.tashimasu.info')
  , path = require('path')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override');


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
  r.connect({ db: 'mailsender' }).then(function(c) {
    r.table('session')
      .filter(function(session) {
        return session('time')
          .inTimezone('+03')
          .date()
          .eq(r.now()
            .inTimezone('+03')
            .date())
      })
      .without('mail')
      .coerceTo('array')
      .orderBy(r.desc('time'))
      .run(c).then(function (result) {
        res.render('index', { result: result });
      })
    .finally(function() {
      c.close();
    });
  });
});

app.get('/s/:sid', function (req, res) {
  var s_sid = req.params.sid;
  r.connect({ db: 'mailsender' }).then(function(c) {
    r.table('session')
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
        .run(c).then(function (result) {
          res.render('session', { result: result, sid: s_sid });
      })
    .finally(function() {
      c.close();
    });
  });
});

app.get('/m/:sid/:st', function (req, res) {
  var s_sid = req.params.sid;
  var s_st = req.params.st;
  r.connect({ db: 'mailsender' }).then(function(c) {
    r.table("session")
      .get(s_sid)('mail')
      .filter({st:'sent'})
      .pluck('addr').limit(10)
    .run(c).then(function (result) {
      res.render('mails', { result: result, sid: s_sid, st: s_st });
    })
    .finally(function() {
      c.close();
    });
  });
});

app.set('port', process.env.PORT || 3300);

app.listen(app.get('port'));