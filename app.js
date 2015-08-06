"use strict";

module.exports = function(app, server)
{
	var path = require('path');

	// Initialize socket.io before ANYTHING else so that everything else has access to it
	require(path.join(__dirname, 'common', 'socket_io')).init(server);

	// Promisification (only needs to be done once)
	var Promise = require("bluebird");
	Promise.promisifyAll(require("mysql/lib/Connection").prototype);
	Promise.promisifyAll(require("mysql/lib/Pool").prototype);
	Promise.promisifyAll(require('bcrypt'));

	var favicon = require('serve-favicon');
	var express = require('express');
	var logger = require('morgan');
	var cookieParser = require('cookie-parser');
	var bodyParser = require('body-parser');
	var stylus = require('stylus');
	var passport = require('passport');
	var flash = require('connect-flash');
	var express_validator = require('express-validator');
	var config = require(path.join(__dirname, 'configuration'));
	var app_config = {};
	app_config.validator = require(path.join(__dirname, 'config', 'validator'));
	app_config.passport = require(path.join(__dirname, 'config', 'passport'));
	app_config.stylus = require(path.join(__dirname, 'config', 'stylus'));
	app_config.routes = require(path.join(__dirname, 'config', 'routes'));
	app_config.config_routes = require(path.join(__dirname, 'config', 'config_routes'));
	app_config.flash = require(path.join(__dirname, 'config', 'flash'));
	app_config.configuration = require(path.join(__dirname, 'config', 'configuration'));
	app_config.session_middleware = require(path.join(__dirname, 'config', 'session_middleware'));
	// Some modules should be initialized when the server starts, but aren't actually needed
	// in this file
	require(path.join(__dirname, 'common', 'words'));
	require(path.join(__dirname, 'common', 'room_name'));

	var args = process.argv.slice(2);

	// view engine setup
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');

	// uncomment after placing your favicon in /public
	//app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
	app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));

	app.use(app_config.session_middleware);

	app.use(passport.initialize());
	app.use(passport.session());
	app_config.passport();


	app.use(express_validator(app_config.validator.options));
	app.use(app_config.validator.middleware);
	app.use(cookieParser());
	app.use(stylus.middleware(app_config.stylus));

	// Static routes
	app.use(express.static(path.join(__dirname, 'public')));

	app.use(flash());
	app.use(app_config.flash);

	// Sets `res.locals.config`
	app.use(app_config.configuration);

	// Routing - If the site is not configured yet, route configuration
	// page rather than regular website
	if (config.properties.is_configured)
		app_config.routes(app);
	else
		app_config.config_routes(app);

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

	return app;
}
