"use strict";
var path = require('path');
var validator = require('validator');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var database = require(path.join(__dirname, 'database'));
var deck_common = require(path.normalize(path.join(__dirname, '..', 'public', 'javascripts', 'common', 'deck')));

// Creates tables necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
// The card table must be initialized before this one
var init_db = function()
{
	return init_deck_list().then(function()
	{
		return init_deck_descriptions();
	})
};

// Creates a table necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
var init_deck_list = function()
{
	return database.pool.queryAsync("SHOW TABLES LIKE 'deck_list';").then(function(result)
	{
		if (result[0].length == 0)
		{
			// This should definitely already be integer type, but it is going in an
			// SQL statement, so make double sure
			var deck_name_length = validator.toInt(config.field_sizes.deck_name, 10);
			if (isNaN(deck_name_length))
				throw new common_deck.error('Configuration setting \'deck_name_length\' is not an integer.');

			var query = 
				"CREATE TABLE deck_list (" +
					"id                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
					"name                     VARCHAR(" + deck_name_length + ") NOT NULL UNIQUE KEY, " +
					"creator                  INT UNSIGNED NOT NULL, " +
					"FOREIGN KEY(creator)     REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"play_count               INT UNSIGNED NOT NULL DEFAULT 0, " +
					"card_count               INT UNSIGNED NOT NULL DEFAULT 0, " +
					"INDEX(play_count)" +
				") ENGINE InnoDB;";
			return database.pool.queryAsync(query);
		}
	});
};

// Creates a table necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
var init_deck_descriptions = function()
{
	return database.pool.queryAsync("SHOW TABLES LIKE 'deck_descriptions';").then(function(result)
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
			return database.pool.queryAsync(query);
		}
	});
};

// Returns a Promise. If the Promise is fulfilled, the deck has been created
// and the deck object will be yielded (the deck object returned will be the same
// as the deck object passed in, with ID now set)
// Request will fail due to MYSQL foreign key restrictions if the the creator_id
// is not valid
var create_deck = function(deck)
{
	return new Promise(function(resolve, reject)
	{
		deck_common.check_deck(deck);
		resolve();
	}).then(function()
	{
		return database.pool.queryAsync('INSERT INTO deck_list (name, creator) VALUES (?, ?);', [deck.name, deck.creator]);
	}).then(function(result)
	{
		deck.id = result[0].insertId
		return deck;
	}).catch(function(err)
	{
		if (err.code == 'ER_DUP_ENTRY')
			throw new deck_common.error('That deck name already exists', 'DUP_DECK_NAME');
		else
			throw err;
	});
};

// Returns a Promise. If the Promise is fulfilled, it will yield an array of all deck
// objects belonging to the specified user
var get_decks_by_user_id = function(id)
{
	return database.pool.queryAsync('SELECT * FROM deck_list WHERE creator = ? ;', [id]).then(function(results)
	{
		return results[0];
	});
};

// Returns a Promise. If the Promise is fulfilled, it will yield an array of cards in
// the deck.
// No error is given if the deck does not exist, an empty array is returned
var get_cards = function(deck_id)
{
	return database.pool.queryAsync('SELECT * FROM deck_descriptions WHERE deck = ? ;', [deck_id]).then(function(results)
	{
		return results[0];
	});
};

module.exports = {
	init_db            : init_db,
	error              : deck_common.error,
	deck_object        : deck_common.deck_object,
	check_deck_name    : deck_common.check_deck_name,
	check_deck         : deck_common.check_deck,
	get_all_by_user_id : get_decks_by_user_id,
	create             : create_deck,
	get_cards          : get_cards
};
