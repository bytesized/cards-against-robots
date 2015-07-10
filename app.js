"use strict";
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var stylus = require('stylus');
var session = require('express-session');
var passport = require('passport');
var local_strategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var express_validator = require('express-validator');
var crypto = require('crypto');

var Promise = require("bluebird");
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

var config = require(path.join(__dirname, 'configuration'));

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Handle Express Sessions
var session_secret = null;
try 
{
	session_secret = crypto.randomBytes(256);
} catch (err)
{
	console.log("Warning! Could not generate a random session key! Falling back on pseudo random key.");
	// Don't catch errors from this. If we can't even get pseudo random bytes, just let the server die
	session_secret = crypto.pseudoRandomBytes(256);
}
app.use(session({
	secret: session_secret.toString(),
	saveUninitialized: true,
	resave: true
}));

app.use(express_validator({
	errorFormatter: function(param, msg, value)
	{
		// Return the param value in an array so that when we emulate this error structure for other errors,
		// we can specify that there is a problem with multiple parameters and safely iterate over them
		return {
			param : [param],
			msg   : msg,
			value : value
		};
	},
	customValidators: require(path.join(__dirname, 'custom_validators'))
}));

app.use(cookieParser());

// Configure stylus. Besides compiling the stylesheets from
// /stylus to /public/stylesheets, we also want to define some
// global variables by passing them in during the compile function
// with the define() function
var stylus_compile = function(str, path)
{
	return stylus(str)
		.set('filename', path)
		.set('compress', true)
		.define('card_image_width', '55px');
}
var stylus_options = {
	src: path.join(__dirname, 'stylus'),
	dest: path.join(__dirname, 'public'),
	compile: stylus_compile
};
app.use(stylus.middleware(stylus_options));

// Static routes
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());
app.use(function (req, res, next)
{
	res.locals.messages = require('express-messages')(req, res);
	next();
});

// Routing - If the site is not configured yet, route configuration
// page rather than regular website
if (config.properties.is_configured)
{
	app.use('/', require(path.join(__dirname, 'routes', 'index')));
	app.use('/user', require(path.join(__dirname, 'routes', 'user')));

	// catch 404 and forward to error handler
	app.use(function(req, res, next)
	{
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});
} else {
	app.use('/configuration', require(path.join(__dirname, 'routes', 'configuration')));

	// In configuration mode, route all requests that
	// are not to configuration to configuration
	app.use(function(req, res, next)
	{
		res.statusCode = 302;
		res.setHeader("Location", "/configuration");
		res.end();
	});
}

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
