"use strict";
var Promise = require('bluebird');
var path = require('path');
var mysql = require('mysql');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));

var database_error = function(message, code)
{
	var error = Error.call(this, message);

	this.name = 'DatabaseError';
	this.message = error.message;
	this.stack = error.stack;
	this.code = code;
}
database_error.prototype = Object.create(Error.prototype);
database_error.prototype.constructor = database_error;

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
		var card = require(path.join(__dirname, 'card'));
		return card.init_db();
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

// This will be run automatically if `config.properties.is_configured == true` or
// manually by this module's `init()` during configuration
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

// Returns a Disposer. Will probably only be used for with_transaction
// The Disposer ensures that the connection obtained is ultimately released
// `create_pool` MUST have run for this to work
var get_connection = function()
{
	return module.exports.pool.getConnectionAsync().disposer(function(connection, promise)
	{
		connection.release();
	});
};

// Execute the function given, passing in a transaction variable as an argument.
// (same as the mysql connection variable, but a transaction has already been
// started)
// Returns a Promise.
// If an error is caught from the function or the Promise it may return, the
// transaction is rolled back. Otherwise it is committed automatically.
// May throw a database_error if connection could not be committed. If error could
// not be rolled back after an error, only the original error is returned.
// Rollback errors do not affect database integrity or the effect of the
// transaction (fails either way), so we will ignore them
var with_transaction = function(fn)
{
	return Promise.using(get_connection(), function(connection)
	{
		return connection.beginTransactionAsync().then(function()
		{
			return fn(connection);
		}).then(function(result)
		{
			return connection.commitAsync().return(result);
		}).catch(function(err)
		{
			// Rollback changes, ignore errors rolling back, then rethrow the same error
			return connection.rollbackAsync().catch(function(rollback_err)
			{
				// LOGGING
				console.log('Warning: Ignored rollback error:');
				console.info(rollback_err);
			}).throw(err);
		});
	});
};

// Set module exports
module.exports = {
	error            : database_error,
	pool             : null,
	init             : init,
	get_connection   : get_connection,
	with_transaction : with_transaction
};
if (config.properties.is_configured)
{
	create_pool();
}
