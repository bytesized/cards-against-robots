"use strict";
// Promisification (only needs to be done once)
var Promise = require("bluebird");
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);
Promise.promisifyAll(require('bcrypt'));

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var stylus = require('stylus');
var session = require('express-session');
var passport = require('passport');
var flash = require('express-flash');
var express_validator = require('express-validator');
var secret = require(path.join(__dirname, 'secret'));
var config = require(path.join(__dirname, 'configuration'));

var app = express();

var args = process.argv.slice(2);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// If the -r option is not specified, allow fallback to pseudorandom data
var allow_random_fallback = (args.indexOf('-r') !== -1);
app.use(session({
	secret: secret.generate(256, allow_random_fallback).toString(),
	saveUninitialized: true,
	resave: true
}));

app.use(passport.initialize());
app.use(passport.session());
// Just including this will configure passport
require(path.join(__dirname, 'config', 'passport'));

app.use(express_validator(require(path.join(__dirname, 'config', 'validator'))));
app.use(cookieParser());
app.use(stylus.middleware(stylus_options));

// Static routes
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());

// Routing - If the site is not configured yet, route configuration
// page rather than regular website
if (config.properties.is_configured)
	require(path.join(__dirname, 'config', 'routes'));
else
	require(path.join(__dirname, 'config', 'config_routes'));

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next)
	{
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next)
{
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});


module.exports = app;
