"use strict";
// If `config.redirect_domain` is set, an http 301 signal is sent to redirect all requests from other domains
// to the one given
var path = require('path');
var config = require(path.join(__dirname, '..', 'configuration'));

module.exports = function(req, res, next)
{
	if (config.properties.is_configured && config.redirect_domain)
	{
		if (req.get('Host') !== config.redirect_domain)
		{
			res.writeHead(301, {'Location': req.protocol + '://' +  config.redirect_domain + req.url});
			res.end();
			return
		}
	}
	next();
};
