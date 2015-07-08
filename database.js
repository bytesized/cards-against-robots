var mysql = require('mysql');
var config = require('./configuration');
var pool;

if (config.is_configured)
{
	// Connect to mysql server
	console.log("Uh oh. Tried to connect to MYSQL, but code is not written yet!");
	pool = null;
} else
{
	pool = null;
}

var init = function(config, callback)
{
	var connection = mysql.createConnection({
		host:     config.mysql.host,
		port:     config.mysql.port,
		user:     config.mysql.user,
		password: config.mysql.password,
		timezone: 'UTC'
	});
	connection.connect(function(err) {
		if (!err)
		{
			// Make tables
			console.log("Uh oh. I'm supposed to be making tables right now, but i'm not");
			err = "Unimplemented!";
		}
		callback(err)
	});
}

module.exports = {
	pool: pool,
	init: init
};