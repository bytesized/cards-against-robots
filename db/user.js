"use strict";
// Contains methods for all necessary interaction with the users table
var path = require('path');
var Promise = require('bluebird');
var validator = require('validator');
var bcrypt = require('bcrypt');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var database = require(path.join(__dirname, 'database'));

// module.exports will include this message object. Reasoning: some functions
// such as check_username throw their error message. These functions may be used
// by express-validator (as a custom validator). Since express-validator intends
// for the caller to provide the error message 
var messages = {};

function user_error(message, code)
{
  var error = Error.call(this, message);

  this.name = 'UserError';
  this.message = error.message;
  this.stack = error.stack;
  this.code = code;
}
user_error.prototype = Object.create(Error.prototype);
user_error.prototype.constructor = user_error;

var user_object = (function() {
	// Constructor. Make sure all properties are defined and admin, superuser, and locked
	// are set to their default values.
	function user_object()
	{
		this.id        = -1;
		this.username  = '';
		this.password  = '';
		this.admin     = false;
		this.superuser = false;
		this.last_seen = null;
		this.locked    = false;
	};
	return user_object;
})();

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

// Internal Validation functions. By specifying the validation functions in this manner,
// they can be used with express-validation, which does not support validation functions
// returning error messages.
var username_validation_fns =
[
	{
		fn: function(username)
		{
			if (username.length < 4)
				return false;
			else if (config.properties.is_configured && username.length > config.field_sizes.username)
				return false;
			else
				return true;
		},
		msg: function(username)
		{
			if (config.properties.is_configured)
				return "Username must be 4-" + config.field_sizes.username + " characters long";
			else
				return "Username must be more than 4 characters long";
		}
	},
	{
		fn: function(username)
		{
			if (username.match(/^[-a-zA-Z0-9_+=:().]*$/) == null)
				return false;
			else
				return true;
		},
		msg: function(username)
		{
			return "Username may only contain letters, numbers, and these special characters: -,_,+,=,:,(,),.";
		}
	}
];

var password_validation_fns = 
[
	{
		fn: function(password)
		{
			if (password.length < 3)
				return false;
			else
				return true;
		},
		msg: function(password)
		{
			return "Password must be at least 3 characters long";
		}
	}
];

// Does not test if user exists and does not include the
// username and password validation above
var user_validation_fns = 
[
	{
		fn: function(user)
		{
			if (user.admin && !user.superuser)
				return false;
			else
				return true;
		},
		msg: function(user)
		{
			return "User cannot be a Super User without being an Administrator";
		}
	}
];

// Throws an error if the username is invalid
// Does not check if the username exists
var check_username = function(candidate)
{
	for (var i = 0; i < username_validation_fns.length; i++)
	{
		if (!username_validation_fns[i].fn(candidate))
			throw new user_error(username_validation_fns[i].msg(candidate), 'BAD_USERNAME');
	}
};

// Validates the username field of the given request
var validate_username_field = function(req, field)
{
	for (var i = 0; i < username_validation_fns.length; i++)
		req.checkBody(field, username_validation_fns[i].msg(req.body[field])).custom_fn(username_validation_fns[i].fn);
}

// Throws an error if the password given is invalid
var check_password = function(candidate)
{
	for (var i = 0; i < password_validation_fns.length; i++)
	{
		if (!password_validation_fns[i].fn(candidate))
			throw new user_error(password_validation_fns[i].msg(candidate), 'BAD_PASSWORD');
	}
};

// Validates the password field of the given request
var validate_password_field = function(req, field)
{
	for (var i = 0; i < password_validation_fns.length; i++)
		req.checkBody(field, password_validation_fns[i].msg(req.body[field])).custom_fn(password_validation_fns[i].fn);
};

// Throws an error if the user is invalid. Includes username and password validity checks
var check_user = function(candidate)
{
	for (var i = 0; i < user_validation_fns.length; i++)
	{
		if (!user_validation_fns[i].fn(candidate))
			throw new user_error(user_validation_fns[i].msg(candidate), 'BAD_USER_ATTRIBUTES');
	}
	check_username(candidate.username);
	check_password(candidate.password);
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
	return new Promise(function(resolve, reject)
	{
		if (config.invitations_required && !override_invitation)
			throw new user_error('Attempt to create user without an invitation', 'INTERNAL_ERROR');
		check_user(user);
		resolve();
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
			throw new user_error('That username is in use', 'DUP_USERNAME');
		else
			throw err;
	});
};

// Returns a Promise which will be fulfilled if the user is created and rejected if it is not
// The promise will be rejected if a user with ID=1 already exists
// The id of the new user will be passed to the fulfillment handler.
// The password that is passed in will be encrypted before it is stored.
var create_primary_superuser = function(user)
{
	user.admin = true;
	user.superuser = true;
	return new Promise(function(resolve, reject)
	{
		check_user(user);
		resolve();
	}).then(function()
	{
		return bcrypt.genSaltAsync(10);
	}).then(function(salt)
	{
		return bcrypt.hashAsync(user.password, salt);
	}).then(function(password_hash)
	{
		return database.pool.queryAsync(
			"INSERT INTO users (id, username,  password,  admin,  superuser,  locked) " +
			           "VALUES ( 1,        ?,         ?,   TRUE,       TRUE,   FALSE);",
			[user.username, password_hash]);
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
	if (user.admin !== undefined)     user.admin     = Boolean(user.admin);
	if (user.superuser !== undefined) user.superuser = Boolean(user.superuser);
	if (user.password !== undefined)  user.password  = user.password.toString('ascii');
	return user;
};

// Returns a Promise that will be fulfilled if password comparison succeeds. The promise
// will yield true if the password matches the hash
var verify_password = function(hash, password)
{
	return bcrypt.compareAsync(password, hash);
};

module.exports = {
	error                    : user_error,
	user_object              : user_object,
	init_db                  : init_db,
	check_username           : check_username,
	validate_username_field  : validate_username_field,
	check_password           : check_password,
	validate_password_field  : validate_password_field,
	create                   : create_user,
	create_primary_superuser : create_primary_superuser,
	get_by_id                : get_user_by_id,
	get_by_username          : get_user_by_username,
	verify_password          : verify_password
};
