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
	return init_card_table(config, connection).then(function()
	{
		return init_deck_list(config, connection);
	}).then(function()
	{
		return init_deck_descriptions(config, connection);
	})
}

// Creates a table necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
// Uses the passed configuration data in place of the regular configuration data,
// since initialization typically means `config.is_configured == false`.
var init_card_table = function(config, connection)
{
	return connection.queryAsync("SHOW TABLES LIKE 'cards';").then(function(result)
	{
		if (result[0].length == 0)
		{
			// This should definitely already be integer type, but it is going in an
			// SQL statement, so make double sure
			var card_text_length = validator.toInt(config.card_text_length, 10);
			if (isNaN(card_text_length))
				throw new Error('Configuration setting \'card_text_length\' is not an integer.');

			var query = 
				"CREATE TABLE cards (" +
					"id                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
					"text                     VARCHAR(" + card_text_length + ") NOT NULL, " +
					"color                    BOOL NOT NULL, " +
					"creator                  INT UNSIGNED NOT NULL, " +
					"FOREIGN KEY(creator)     REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"deck_count               INT UNSIGNED NOT NULL DEFAULT 0, " +
					"INDEX(deck_count, color), " +
					"play_count               INT UNSIGNED NOT NULL DEFAULT 0, " +
					"INDEX(play_count), " +
					"win_count                INT UNSIGNED NOT NULL DEFAULT 0, " +
					"INDEX(win_count), " +
					"win_ratio                FLOAT NOT NULL DEFAULT 0, " +
					"INDEX(win_ratio)" +
				") ENGINE InnoDB;";
			return connection.queryAsync(query);
		}
	});
}

// Creates a table necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
// Uses the passed configuration data in place of the regular configuration data,
// since initialization typically means `config.is_configured == false`.
var init_deck_list = function(config, connection)
{
	return connection.queryAsync("SHOW TABLES LIKE 'deck_list';").then(function(result)
	{
		if (result[0].length == 0)
		{
			// This should definitely already be integer type, but it is going in an
			// SQL statement, so make double sure
			var deck_name_length = validator.toInt(config.deck_name_length, 10);
			if (isNaN(deck_name_length))
				throw new Error('Configuration setting \'deck_name_length\' is not an integer.');

			var query = 
				"CREATE TABLE deck_list (" +
					"id                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
					"name                     VARCHAR(" + deck_name_length + ") NOT NULL, " +
					"creator                  INT UNSIGNED NOT NULL, " +
					"FOREIGN KEY(creator)     REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"play_count               INT UNSIGNED NOT NULL DEFAULT 0, " +
					"INDEX(play_count)" +
				") ENGINE InnoDB;";
			return connection.queryAsync(query);
		}
	});
}

// Creates a table necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
// Uses the passed configuration data in place of the regular configuration data,
// since initialization typically means `config.is_configured == false`.
var init_deck_descriptions = function(config, connection)
{
	return connection.queryAsync("SHOW TABLES LIKE 'deck_descriptions';").then(function(result)
	{
		if (result[0].length == 0)
		{
			var query = 
				"CREATE TABLE deck_descriptions (" +
					"deck                 INT UNSIGNED NOT NULL, " +
					"FOREIGN KEY(deck)    REFERENCES deck_list(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"card                 INT UNSIGNED NOT NULL, " +
					"FOREIGN KEY(card)    REFERENCES cards(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"quantity             INT UNSIGNED NOT NULL" +
					// Need to have an index on the deck column so desk's can be assembled quickly, but
					// with InnoDB (default engine) FOREIGN KEY's are indexed anyways. Rather than
					// creating an index, I will just force use of the InnoDB engine.
				") ENGINE InnoDB;";
			return connection.queryAsync(query);
		}
	});
}

module.exports = {
	init_db: init_db
};