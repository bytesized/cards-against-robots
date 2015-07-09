var Promise = require('bluebird');
var path = require('path');
var mysql = require('mysql');
var config = require(path.join(__dirname, 'configuration'));
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

// Creates the database and tables necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
// Uses the passed configuration data in place of the regular configuration data,
// since initialization typically means `config.is_configured == false`.
var init = function(config)
{
	var connection = mysql.createConnection({
		host:     config.mysql.host,
		port:     config.mysql.port,
		user:     config.mysql.username,
		password: config.mysql.password,
		timezone: 'UTC'
	});
	var query = 'CREATE DATABASE IF NOT EXISTS ' + connection.escapeId(config.mysql.database);
	return connection.queryAsync(query).then(function()
	{
		var query = 'USE ' + connection.escapeId(config.mysql.database);
		return connection.queryAsync(query);
	}).then(function()
	{
		var user = require(path.join(__dirname, 'user'));
		return user.init_db(config, connection);
	}).then(function()
	{
		var deck = require(path.join(__dirname, 'deck'));
		return deck.init_db(config, connection);
	}).then(function()
	{
		var invitation = require(path.join(__dirname, 'invitation'));
		return invitation.init_db(config, connection);
	});
}

module.exports = {
	pool: pool,
	init: init
};