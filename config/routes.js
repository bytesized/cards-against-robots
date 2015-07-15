"use strict";
// Configures the app passed in to use the routes necessary for standard functionality
// Also handles requests that match nothing by sending 404
var path = require('path');
var config = require(path.join(__dirname, 'configuration'));

module.exports = function(app)
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
}