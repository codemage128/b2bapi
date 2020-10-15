require('dotenv').config({path : '/usr/local/b2bapi/.env'});
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var ejwt = require('express-jwt');
var authorize = require('./modules/authorize');
var routes = require('./routes/index');
var accounts = require('./routes/accounts')
var checkhost = require('./modules/checkhost');
var app = express();
var exphbs  = require('express-handlebars');
Array.prototype.contains = function ( needle ) {
   for (i in this) {
      if (this[i] == needle) return true;
   }
   return false;
}
Array.prototype.getIndex = function ( needle ) {
   for (i in this) {
      if (this[i] == needle) return i;
   }
   return false;
}
// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
console.log('STARTING B2B API VERSION :', process.env.VERSION);
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.set('jwtTokenSecret', process.env.JWT_SECRET);
app.set('env', process.env.ENV);
app.use(cors());

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(checkhost);
app.use(ejwt({secret : app.get('jwtTokenSecret'), getToken: function fromHeaderOrQuerystring (req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  }}).unless({path : ['/api/auth', '/api/version', '/api/whitelabel', '/api/whitelabel_logo', '/api/whitelabel/main.css']}));
  
app.use(authorize);

app.use('/api/accounts', accounts)
app.use('/api', routes);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: {}
  });
});


module.exports = app;
