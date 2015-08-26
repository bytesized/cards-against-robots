"use strict";
// Contains methods for all necessary interaction with the users table
var path = require('path');
var Promise = require('bluebird');
var validator = require('validator');
var bcrypt = require('bcrypt');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var database = require(path.join(__dirname, 'database'));
var user_common = require(path.normalize(path.join(__dirname, '..', 'public', 'javascripts', 'common', 'user')));
var standard_decks = require(path.normalize(path.join(__dirname, '..', 'common', 'standard_decks')));

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
			var username_length = validator.toInt(config.field_sizes.username, 10);
			if (isNaN(username_length))
				throw new user_common.error('Configuration setting \'username_length\' is not an integer.');

			var query = 
				"CREATE TABLE users (" +
					"id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
					"username   VARCHAR(" + username_length + ") NOT NULL UNIQUE KEY, " +
					"password   BINARY(60) NOT NULL, " +
					"admin      BOOL NOT NULL, " +
					"superuser  BOOL NOT NULL, " +
					"locked     BOOL NOT NULL" +
				") ENGINE InnoDB;";
			return database.pool.queryAsync(query);
		}
	});
};

// Validates the username field of the given request
var validate_username_field = function(req, field)
{
	for (var i = 0; i < user_common.username_validation_fns.length; i++)
		req.checkBody(field, user_common.username_validation_fns[i].msg(req.body[field])).custom_fn(user_common.username_validation_fns[i].fn);
}

// Validates the password field of the given request
var validate_password_field = function(req, field)
{
	for (var i = 0; i < user_common.password_validation_fns.length; i++)
		req.checkBody(field, user_common.password_validation_fns[i].msg(req.body[field])).custom_fn(user_common.password_validation_fns[i].fn);
};

// Returns a Promise which will be fulfilled if the user is created and rejected if it is not
// The id of the new user will be passed to the fulfillment handler.
// The password that is passed in will be encrypted before it is stored.
// `admin` and `superuser` should be booleans
// If invitations are enabled, this function will always throw an error unless `override_invitation`
// is true. Reasoning: If invitations are required, this function should not be used except
// in special circumstances. The version of this function in the
// invitation module should be used instead.
var create_user = function(user, override_invitation)
{
	return Promise.try(function(resolve, reject)
	{
		if (config.invitations_required && !override_invitation)
			throw new user_common.error('Attempt to create user without an invitation', 'INTERNAL_ERROR');
		user_common.check_user(user);
	}).then(function()
	{
		return bcrypt.genSaltAsync(10);
	}).then(function(salt)
	{
		return bcrypt.hashAsync(user.password, salt);
	}).then(function(password_hash)
	{
		user.password = password_hash;
		return database.pool.queryAsync(
			"INSERT INTO users (username,  password,  admin,  superuser,  locked) " +
			           "VALUES (       ?,         ?,      ?,          ?,       ?);",
			[user.username, password_hash, user.admin, user.superuser, user.locked]);
	}).then(function(result)
	{
		user.id = result[0].insertId;
		return user;
	}).catch(function (err)
	{
		if (err.code == 'ER_DUP_ENTRY')
			throw new user_common.error('That username is in use', 'DUP_USERNAME');
		else
			throw err;
	});
};

// Returns a Promise which will be fulfilled if the user is created and rejected if it is not
// The promise will be rejected if a user with ID=1 already exists
// The id of the new user will be passed to the fulfillment handler.
// The password that is passed in will be encrypted before it is stored.
// This function also adds the standard decks to the primary superuser's deck list
// The Promise, if fulfilled, will yield an array. The first array item will be the
// user object of the created user. The second item will be an array of decks objects
// describing the decks created for the user
var create_primary_superuser = function(user)
{
	return database.with_transaction(function(connection)
	{
		user.admin = true;
		user.superuser = true;
		return Promise.try(function()
		{
			user_common.check_user(user);
		}).then(function()
		{
			return bcrypt.genSaltAsync(10);
		}).then(function(salt)
		{
			return bcrypt.hashAsync(user.password, salt);
		}).then(function(password_hash)
		{
			return connection.queryAsync(
				"INSERT INTO users (id, username,  password,  admin,  superuser,  locked) " +
				           "VALUES ( 1,        ?,         ?,   TRUE,       TRUE,   FALSE);",
				[user.username, password_hash]).catch(function(err)
			{
				// Need to distinguish between duplicate user and duplicate id
				if (err.code == 'ER_DUP_ENTRY')
				{
					if (err.message == 'ER_DUP_ENTRY: Duplicate entry \'1\' for key \'PRIMARY\'')
						throw new user_common.error('Primary Super User already exists', 'BAD_REQUEST');
					else
						throw new user_common.error('That username is in use', 'BAD_USERNAME');
				} else {
					throw err;
				}
			});
		}).then(function(result)
		{
			user.id = 1;
			return standard_decks.add(user.id, connection).then(function(decks)
			{
				return [user, decks];
			});
		});
	});
};

// Returns a Promise which will be fulfilled if lookup succeeds. The promise will yield a 
// user object if the user is found, or `null` if not
var get_user_by_id = function(id)
{
	return database.pool.queryAsync("SELECT * FROM users WHERE id = ? ;", [id]).then(function(results)
	{
		if (results[0].length == 0)
		{
			return null;
		} else {
			var user = user_fix_types(results[0][0]);
			return user;
		}
	});
};

// Returns a Promise which will be fulfilled if lookup succeeds. The promise will yield a 
// user object if the user is found, or `null` if not
var get_user_by_username = function(username)
{
	return database.pool.queryAsync("SELECT * FROM users WHERE username = ? ;", [username]).then(function(results)
	{
		if (results[0].length == 0)
		{
			return null;
		} else {
			var user = user_fix_types(results[0][0]);
			return user;
		}
	});
};

// When pulling data out of MYSQL, some fields will not have the expected types. This function
// converts these fields.
var user_fix_types = function(user)
{
	if (user.password !== undefined)
		user.password = user.password.toString('ascii');
	return user;
};

// Returns a Promise that will be fulfilled if password comparison succeeds. The promise
// will yield true if the password matches the hash
var verify_password = function(hash, password)
{
	return bcrypt.compareAsync(password, hash);
};

module.exports = {
	error                    : user_common.error,
	user_object              : user_common.user_object,
	init_db                  : init_db,
	check_username           : user_common.check_username,
	validate_username_field  : validate_username_field,
	check_password           : user_common.check_password,
	validate_password_field  : validate_password_field,
	check_user               : user_common.check_user,
	create                   : create_user,
	create_primary_superuser : create_primary_superuser,
	get_by_id                : get_user_by_id,
	get_by_username          : get_user_by_username,
	verify_password          : verify_password
};
