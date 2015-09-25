// Only use this config if configuration is configured
var path = require('path');
var session = require('express-session');
var mysql_session_store = require('express-mysql-session');
var database = require(path.normalize(path.join(__dirname, '..', 'db', 'database')));
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));

if (config.properties.is_configured)
{
	var session_store = new mysql_session_store({}, database.pool);

	module.exports = session({
		secret: config.session_secret,
		saveUninitialized: true,
		store: session_store,
		resave: true,
		cookie: { secure: true }
	});
}
else
{
	// If we are configuring, use non-mysql-sessions
	module.exports = session({
		secret: config.session_secret,
		saveUninitialized: true,
		resave: true,
		cookie: { secure: true }
	});
}
