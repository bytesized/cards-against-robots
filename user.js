"use strict";
var path = require('path');
var validator = require('validator');
var config = require(path.normalize(path.join(__dirname, 'configuration')));
var database = require(path.normalize(path.join(__dirname, 'database')));

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
				throw new Error('Configuration setting \'username_length\' is not an integer.');

			var query = 
				"CREATE TABLE users (" +
					"id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
					"username   VARCHAR(" + username_length + ") NOT NULL UNIQUE KEY, " +
					"password   VARCHAR(255) NOT NULL, " +
					"admin      BOOL NOT NULL, " +
					"superuser  BOOL NOT NULL, " +
					"last_seen  TIMESTAMP NULL, " +
					"locked     BOOL NOT NULL" +
				") ENGINE InnoDB;";
			return database.pool.queryAsync(query);
		}
	});
};

// Returns a Promise that will be fulfilled if the user name is valid or rejected if not
var valid_username = function(candidate)
{
	// FIXME
};

module.exports = {
	init_db        : init_db,
	valid_username : valid_username
};
