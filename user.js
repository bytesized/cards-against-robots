"use strict";
var path = require('path');
var Promise = require('bluebird');
var validator = require('validator');
var bcrypt = require('bcrypt');
var config = require(path.join(__dirname, 'configuration'));
var database = require(path.join(__dirname, 'database'));

function user_error(message, code)
{
  var error = Error.call(this, message);

  this.name = 'User Error';
  this.message = error.message;
  this.stack = error.stack;
  this.code = code;
}
user_error.prototype = Object.create(Error.prototype);
user_error.prototype.constructor = user_error;

// Creates tables necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
var init_db = function()
{
	return database.pool.queryAsync("SHOW TABLES LIKE 'users';").then(function(result)
	{
		if (result[0].length == 0)
		{
			// This should definitely already be integer type, but it is going in an
			// SQL statement, so make double sure
			var username_length = validator.toInt(config.username_length, 10);
			if (isNaN(username_length))
				throw new user_error('Configuration setting \'username_length\' is not an integer.');

			var query = 
				"CREATE TABLE users (" +
					"id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
					"username   VARCHAR(" + username_length + ") NOT NULL UNIQUE KEY, " +
					"password   BINARY(60) NOT NULL, " +
					"admin      BOOL NOT NULL, " +
					"superuser  BOOL NOT NULL, " +
					"last_seen  TIMESTAMP NULL, " +
					"locked     BOOL NOT NULL" +
				") ENGINE InnoDB;";
			return database.pool.queryAsync(query);
		}
	});
};

// Throws an error if the username is invalid
// Does not check if the username exists
var check_username = function(candidate)
{
	if (candidate == '')
		throw new user_error('Username is required', 'BAD_USERNAME');
	if (candidate.match(/^[-a-zA-Z0-9_+=:().]+$/) == null)
		throw new user_error('Username may only contain letters, numbers, and these special characters: -,_,+,=,:,(,),.', 'BAD_USERNAME');
};

var check_password = function(candidate)
{
	if (candidate == '')
		throw new user_error('Password is required', 'BAD_PASSWORD');
};

// Returns a Promise which will be fulfilled if the user is created and rejected if it is not
// The id of the new user will be passed to the fulfillment handler.
// The password that is passed in will be encrypted before it is stored.
// `admin` and `superuser` should be booleans
// If invitations are enabled, this function will always throw an error unless `override_invitation`
// is true. Reasoning: If invitations are required, this function should not be used except
// in special circumstances. The version of this function in the
// invitation module should be used instead.
var create_user = function(username, password, admin, superuser, override_invitation)
{
	return new Promise(function(resolve, reject)
	{
		if (config.invitations_required && !override_invitation)
			throw new user_error('Attempt to create user without an invitation', 'INTERNAL_ERROR');
		check_username(username);
		check_password(password);
		if (superuser && !admin)
			throw new user_error('Attempted to make a non-admin superuser', 'INTERNAL_ERROR');
		resolve();
	}).then(function()
	{
		return bcrypt.genSaltAsync(10);
	}).then(function(salt)
	{
		return bcrypt.hashAsync(password, salt);
	}).then(function(password_hash)
	{
		return database.pool.queryAsync(
			"INSERT INTO users (username,  password,  admin,  superuser,  locked) " +
			           "VALUES (       ?,         ?,      ?,          ?,   FALSE);",
			[username, password_hash, admin, superuser]);
	}).catch(function (err)
	{
		if (err.code == 'ER_DUP_ENTRY')
			throw new user_error('That username is in use', 'BAD_USERNAME');
		else
			throw err;
	});
};

// Returns a Promise which will be fulfilled if the user is created and rejected if it is not
// The promise will be rejected if a user with ID=1 already exists
// The id of the new user will be passed to the fulfillment handler.
// The password that is passed in will be encrypted before it is stored.
var create_primary_superuser = function(username, password)
{
	return new Promise(function(resolve, reject)
	{
		check_username(username);
		check_password(password);
		resolve();
	}).then(function()
	{
		return bcrypt.genSaltAsync(10);
	}).then(function(salt)
	{
		return bcrypt.hashAsync(password, salt);
	}).then(function(password_hash)
	{
		return database.pool.queryAsync(
			"INSERT INTO users (id, username,  password,  admin,  superuser,  locked) " +
			           "VALUES ( 1,        ?,         ?,   TRUE,       TRUE,   FALSE);",
			[username, password_hash]);
	}).catch(function(err)
	{
		// Need to distinguish between duplicate user and duplicate id
		if (err.code == 'ER_DUP_ENTRY')
		{
			if (err.message == 'ER_DUP_ENTRY: Duplicate entry \'1\' for key \'PRIMARY\'')
				throw new user_error('Primary Super User already exists', 'BAD_REQUEST');
			else
				throw new user_error('That username is in use', 'BAD_USERNAME');
		} else {
			throw err;
		}
	});
}

module.exports = {
	error                    : user_error,
	init_db                  : init_db,
	check_username           : check_username,
	create                   : create_user,
	create_primary_superuser : create_primary_superuser
};
