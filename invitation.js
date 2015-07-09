var path = require('path');
var validator = require('validator');
var configuration = require(path.normalize(path.join(__dirname, 'configuration')));
var database = require(path.normalize(path.join(__dirname, 'database')));

// Creates tables necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
// Uses the passed configuration data in place of the regular configuration data,
// since initialization typically means `config.is_configured == false`.
var init_db = function(config, connection)
{
	return connection.queryAsync("SHOW TABLES LIKE 'invitations';").then(function(result)
	{
		if (result[0].length == 0)
		{
			// This should definitely already be integer type, but it is going in an
			// SQL statement, so make double sure
			var token_length = validator.toInt(config.token_length, 10);
			if (isNaN(token_length))
				throw new Error('Configuration setting \'token_length\' is not an integer.');

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
			return connection.queryAsync(query);
		}
	});
}

module.exports = {
	init_db : init_db
};