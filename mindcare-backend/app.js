var createError = require('http-errors');
var express = require('express');
require('dotenv/config');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors')

const mongoose = require('mongoose')


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRoute = require('./routes/auth')

var app = express();

// view engine setup incommin engine setup

mongoose.connect(
  process.env.MongoURI,{ useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false 
  })
.then(() => console.log("Successfully connected to database:)"))
.catch(err => console.log(err));


app.use('/welcome',express.static(__dirname + '/landing'));
app.use(express.static(__dirname + '/dist'));

app.use(cors({
  origin:'http://localhost:4200'
 
}))


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth',authRoute)
app.use(express.urlencoded({ extended: false }))
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
 