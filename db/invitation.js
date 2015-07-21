"use strict";
var path = require('path');
var validator = require('validator');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var database = require(path.join(__dirname, 'database'));

function invitation_error(message)
{
  var error = Error.call(this, message);

  this.name = 'invitation_error';
  this.message = error.message;
  this.stack = error.stack;
}
invitation_error.prototype = Object.create(Error.prototype);
invitation_error.prototype.constructor = invitation_error;

// Creates tables necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
var init_db = function()
{
	return database.pool.queryAsync("SHOW TABLES LIKE 'invitations';").then(function(result)
	{
		if (result[0].length == 0)
		{
			// This should definitely already be integer type, but it is going in an
			// SQL statement, so make double sure
			var token_length = validator.toInt(config.field_sizes.token, 10);
			if (isNaN(token_length))
				throw new invitation_error('Configuration setting \'token_length\' is not an integer.');

			var query = 
				"CREATE TABLE invitations (" +
					"id                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
					"token                    CHAR(" + token_length + ") NOT NULL, " +
					"issuer                   INT UNSIGNED NOT NULL, " +
					"FOREIGN KEY(issuer)      REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"issue_date               TIMESTAMP NULL, " +
					"used_by                  INT UNSIGNED, " +
					"FOREIGN KEY(used_by)     REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"use_date                 TIMESTAMP NULL" +
				") ENGINE InnoDB;";
			return database.pool.queryAsync(query);
		}
	});
}

module.exports = {
	init_db : init_db,
	error   : invitation_error
};