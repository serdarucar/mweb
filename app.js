'use strict';

require('pmx').init({
  ignore_routes: [/socket\.io/],
  errors: true,
  custom_probes: true
});

var express = require('express'),
  app = express(),
  io = require('socket.io').listen(app.listen(process.env.PORT || 8888)),
  db = require('./lib/db'),
  exphbs = require('express-handlebars'),
  helpers = require('./lib/helpers'),
  debug = require('debug')('smw.tashimasu.info'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  session = require('express-session'),
  math = require('mathjs'),
  moment = require('moment'),
  pmx = require('pmx');

// `ExpressHandlebars` instance creation.
var hbs = exphbs.create({
  defaultLayout: 'default',
  helpers: helpers,
  extname: '.html'
});

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

// SOCKET.IO EMITTERS
db.mailStatChanges(function(err, cursor) {
  cursor.each(function(err, data) {
    io.sockets.emit("mailstats", data);
  });
});

// EXPRESS ROUTES
app.get('/', function(req, res) {
  var today = moment().format('YYYYMMDD');
  res.redirect('/' + today);
});

app.get('/list', function(req, res) {

    db.getUsersLists(req.user, function(err, result) {
      res.render('list', {
        list: JSON.stringify(result),
        user: req.user
      });
    });

  });

app.get('/new', function(req, res) {
    res.render('new', {
      user: req.user
    });
  });

app.get('/:date', function(req, res) {

    var year = parseInt(req.params.date.substring(0, 4));
    var month = parseInt(req.params.date.substring(4, 6));
    var day = parseInt(req.params.date.substring(6, 8));

    db.getLatestMailByDate(req.user, year, month, day, function(err, result) {
      if (result.length > 0) {
        res.redirect('/' + req.params.date + '/' + result);
      } else {
        res.render('index', { nomail: true, date: moment(req.params.date, "YYYYMMDD") });
      }
    });

  });

app.get('/:date/:sid', function(req, res) {

    db.getMailBySID(req.params.sid, function(err, result) {
      res.render('index', {
        result: result,
        date: result.time,
        user: req.user
      });
    });

  });

app.get('/session/:sid/:lim', function(req, res) {

    var s_sid = req.params.sid;
    var n_lim = parseInt(req.params.lim);
    var n_lim_next = n_lim * 10;

    db.getSessionMails(s_sid, n_lim, function(err, result) {
      res.render('session', {
        result: result,
        sid: s_sid,
        aft_lim: n_lim_next,
        user: req.user
      });
    });

  });

app.get('/detail/:qid/:addr', function(req, res) {

    var s_uid = req.params.qid + '/' + req.params.addr;

    db.getMailDetail(s_uid, function(err, result) {
      res.render('log', {
        result: result,
        user: req.user
      });
    });

  });

app.use(pmx.expressErrorHandler());
