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
  shortid = require('shortid'),
  request = require('request-json'),
  pmx = require('pmx');

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

// SOCKET.IO EMITTERS
db.mailStatChanges(function(err, cursor) {
  cursor.each(function(err, data) {
    io.sockets.emit("mailstats", data);
  });
});

// MIDDLEWARE (get user)
app.use(function(req, res, next) {
  db.getUser('b95eeb70-4768-4720-8b41-af15ea6ed0c3', function(err, user) {
    req.user = user;
    next();
  });
});

// EXPRESS ROUTES
app.get('/', function(req, res) {
  var today = moment().format('YYYYMMDD');
  res.redirect('/' + today);
});

app.post('/mailsender', function(req, res) {

  var prebody = "<html><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'></head><body>";
  var postbody = "</body></html>";
  var body = prebody + req.body.body + postbody;

  db.getMailArrFromListIDs(req.user.id, req.body.recipients, function(err, result) {

    var maildata = {
      fromaddr: req.user.email,
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

app.post('/savelist', function(req, res) {

  var newlist = {
    id: shortid.generate(),
    name: req.body.listname,
    members: req.body.listdata,
    count: req.body.listcount
  }

  db.saveMailList(req.user.id, newlist);

});

app.post('/deletelist', function(req, res) {

  req.body.listdelete.forEach(function(listid) {
    db.deleteMailList(req.user.id, listid);
  });

});

app.get('/:date', function(req, res) {

  var m = moment(req.params.date, 'YYYYMMDD');

  var year = parseInt(req.params.date.substring(0, 4));
  var month = parseInt(req.params.date.substring(4, 6));
  var day = parseInt(req.params.date.substring(6, 8));

  if (m.isValid()) {
    db.getLatestMailByDate(req.user, year, month, day, function(err, result) {
      if (result.length > 0) {
        res.redirect('/' + req.params.date + '/' + result);
      } else {
        res.render('index', { nomail: true, date: moment(req.params.date, "YYYYMMDD"), user: req.user });
      }
    });
  } else {
    res.render('404', { url: req.url, title: 'Page Not Found', user: req.user });
  }
});

app.get('/:date/:sid', function(req, res) {

  var m = moment(req.params.date, 'YYYYMMDD');

  var year = parseInt(req.params.date.substring(0, 4));
  var month = parseInt(req.params.date.substring(4, 6));
  var day = parseInt(req.params.date.substring(6, 8));

  if (m.isValid()) {
    db.getMailBySID(req.params.sid, year, month, day, function(err, result) {
      if (result) {
        res.render('index', {
          result: result,
          date: result.time,
          user: req.user
        });
      } else {
        res.render('404', { url: req.url, title: 'Page Not Found', user: req.user });
      }
    });
  } else {
    res.render('404', { url: req.url, title: 'Page Not Found', user: req.user });
  }
});

app.get('/session/:sid/:lim', function(req, res) {

  var s_sid = req.params.sid;
  var n_lim = parseInt(req.params.lim);
  var n_lim_next = n_lim * 10;

  db.getSessionMails(s_sid, n_lim, function(err, result) {
    if (result) {
      res.render('session', {
        result: result,
        sid: s_sid,
        aft_lim: n_lim_next,
        user: req.user
      });
    } else {
      res.render('404', { url: req.url, title: 'Page Not Found', user: req.user });
    }
  });

});

app.get('/detail/:qid/:addr', function(req, res) {

  var s_uid = req.params.qid + '/' + req.params.addr;

  db.getMailDetail(s_uid, function(err, result) {
    if (result) {
      res.render('log', {
        result: result,
        user: req.user
      });
    } else {
      res.render('404', { url: req.url, title: 'Page Not Found', user: req.user });
    }
  });

});

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

app.use(pmx.expressErrorHandler());
