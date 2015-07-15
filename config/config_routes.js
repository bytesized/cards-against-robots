"use strict";
// Configures the app passed in to route requests to the configuration page.
// All requests anywhere else are redirected to the configuration page
var path = require('path');
var config = require(path.join(__dirname, '..', 'configuration'));

module.exports = function(app)
{
	app.use('/configuration', require(path.join(__dirname, '..', 'routes', 'configuration')));

	// In configuration mode, route all requests that
	// are not to configuration to configuration
	app.use(function(req, res, next)
	{
		res.statusCode = 302;
		res.setHeader("Location", "/configuration");
		res.end();
	});
};