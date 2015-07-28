"use strict";
var path = require('path');
var validator = require('validator');
var Promise = require("bluebird");
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var database = require(path.join(__dirname, 'database'));
var card_common = require(path.normalize(path.join(__dirname, '..', 'public', 'javascripts', 'common', 'card')));

// Creates a table necessary for the site to run. Returns a Promise.
// The Promise will be rejected only if the tables still do not exist (that is to say,
// the Promise will be fulfilled if the database and tables already exist)
var init_db = function()
{
	return database.pool.queryAsync("SHOW TABLES LIKE 'cards';").spread(function(results, fields)
	{
		if (results.length == 0)
		{
			// This should definitely already be integer type, but it is going in an
			// SQL statement, so make double sure
			var card_text_length = validator.toInt(config.field_sizes.card_text, 10);
			if (isNaN(card_text_length))
				throw new deck_error('Configuration setting \'card_text_length\' is not an integer.');

			var query = 
				"CREATE TABLE cards (" +
					"id                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, " +
					"text                     VARCHAR(" + card_text_length + ") NOT NULL, " +
					"color                    BOOL NOT NULL, " +
					"UNIQUE KEY (text, color), " +
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
			return database.pool.queryAsync(query);
		}
	});
};

// Returns a Promise. If the Promise is fulfilled, the card now exists
// and the object describing it will be returned.
// This function takes one of two actions:
//  - If a card with the specified text and color already exists, an
//    object describing it is returned
//  - If no such card exists, one will be inserted into the table from
//    the object given. The same object's id property will be set
//    and then the object will be returned
var create_card = function(card)
{
	return Promise.try(function()
	{
		card_common.check_card(card);
	}).then(function()
	{
		return database.pool.queryAsync('INSERT INTO cards (text, color, creator) VALUES (?, ?, ?);',
			[card.text, card.color, card.creator]);
	}).spread(function(results, fields)
	{
		card.id = results.insertId;
		console.info(card);
		return card;
	}).catch(function(err)
	{
		if (err.code == 'ER_DUP_ENTRY')
			return database.pool.queryAsync('SELECT * FROM cards WHERE text = ? AND color = ? ;',
				[card.text, card.color]).spread(function(results, fields)
			{
				return results[0];
			});
		else
			throw err;
	});
};

module.exports = {
	init_db              : init_db,
	error                : card_common.error,
	card_object          : card_common.card_object,
	black                : card_common.black,
	white                : card_common.white,
	blank_count          : card_common.blank_count,
	check_card_text      : card_common.check_card_text,
	check_card           : card_common.check_card,
	create               : create_card
};