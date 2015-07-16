"use strict";
// Includes the config object in `res.locals`
var path = require('path');
var config = require(path.join(__dirname, '..', 'configuration'));

module.exports = function(req, res, next)
{
	if (config.properties.is_configured)
		res.locals.config = config;
	next();
}