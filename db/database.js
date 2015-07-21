"use strict";
var Promise = require('bluebird');
var path = require('path');
var mysql = require('mysql');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));

// Creates the database and tables necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
var init = function()
{
	var connection = mysql.createConnection({
		host     : config.mysql.host,
		port     : config.mysql.port,
		user     : config.mysql.username,
		password : config.mysql.password,
		timezone : 'UTC'
	});
	var query = 'CREATE DATABASE IF NOT EXISTS ' + connection.escapeId(config.mysql.database);
	return connection.queryAsync(query).then(function()
	{
		connection.destroy();
		return create_pool();
	}).then(function()
	{
		var user = require(path.join(__dirname, 'user'));
		return user.init_db();
	}).then(function()
	{
		var deck = require(path.join(__dirname, 'deck'));
		return deck.init_db();
	}).then(function()
	{
		var invitation = require(path.join(__dirname, 'invitation'));
		return invitation.init_db();
	});
};

var create_pool = function()
{
	module.exports.pool = mysql.createPool({
		connectionLimit : config.mysql.connection_limit,
		host            : config.mysql.host,
		port            : config.mysql.port,
		user            : config.mysql.username,
		password        : config.mysql.password,
		database        : config.mysql.database,
		timezone        : 'UTC'
	});
};

// Set module exports
module.exports = {
	pool : null,
	init : init
};
if (config.properties.is_configured)
{
	create_pool();
}
