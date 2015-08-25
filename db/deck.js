"use strict";
var path = require('path');
var validator = require('validator');
var Promise = require("bluebird");
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var card = require(path.join(__dirname, 'card'));
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
	return database.pool.queryAsync("SHOW TABLES LIKE 'deck_list';").spread(function(results, fields)
	{
		if (results.length == 0)
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
	return database.pool.queryAsync("SHOW TABLES LIKE 'deck_descriptions';").spread(function(results, fields)
	{
		if (results.length == 0)
		{
			var query = 
				"CREATE TABLE deck_descriptions (" +
					"deck                 INT UNSIGNED NOT NULL, " +
					"FOREIGN KEY(deck)    REFERENCES deck_list(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"card                 INT UNSIGNED NOT NULL, " +
					"FOREIGN KEY(card)    REFERENCES cards(id) ON DELETE RESTRICT ON UPDATE CASCADE, " +
					"UNIQUE KEY (deck, card), " +
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
	return Promise.try(function()
	{
		deck_common.check_deck(deck);
	}).then(function()
	{
		return database.pool.queryAsync('INSERT INTO deck_list (name, creator) VALUES (?, ?);', [deck.name, deck.creator]);
	}).spread(function(results, fields)
	{
		deck.id = results.insertId
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
	return database.pool.queryAsync('SELECT * FROM deck_list WHERE creator = ? ;', [id]).spread(function(results, fields)
	{
		return results;
	});
};

// Returns a Promise. If the Promise is fulfilled, it will yield an array of cards in
// the deck.
// No error is given if the deck does not exist, an empty array is returned
var get_cards = function(deck_id)
{
	return database.pool.queryAsync('SELECT * FROM deck_descriptions WHERE deck = ? ;', [deck_id]).spread(function(results, fields)
	{
		return results;
	});
};

// Returns a Promise. If the Promise is fulfilled, it will yield a deck object.
// Note: The deck object does not contain the cards in the deck
var get_deck_by_id = function(deck_id)
{
	return database.pool.queryAsync('SELECT * FROM deck_list WHERE id = ? ;', [deck_id]).spread(function(results, fields)
	{
		return results[0];
	});
};

// Returns a Promise. If user owns the deck, the Promise is fulfilled and yields the deck object.
// If the user does not own the deck, the Promise is rejected
var ensure_user_ownership = function(deck_id, user_id)
{
	return get_deck_by_id(deck_id).then(function(deck_object)
	{
		if (deck_object.creator !== user_id)
			throw new deck_common.error('That deck is owned by someone else', 'PERMISSION_DENIED');
		return deck_object;
	});
};

// Returns a Promise. If the card was is now in the deck and the quantity is equal to the quantity
// given, the Promise is fulfilled.
// If the card is already in the deck, it is not added again; the quantity is updated (not added!)
// to be the quantity given
var add_card_to_deck = function(card_id, deck_id, quantity)
{
	return database.with_transaction(function(connection)
	{
		return add_card_to_deck_no_transaction(card_id, deck_id, quantity, connection);
	});
};

// Returns a Promise. This function is identical to `add_card_to_deck`, but does NOT use a transaction
// a transaction MUST be used with this function. This function exists for use ONLY if it is being called
// from a function that is providing a transaction and wants this functionality as part of a larger
// transaction
var add_card_to_deck_no_transaction = function(card_id, deck_id, quantity, connection)
{
	return connection.queryAsync('INSERT INTO deck_descriptions (deck, card, quantity) VALUES (?, ?, ?);',
		[deck_id, card_id, quantity]).spread(function(results, fields)
	{
		return Promise.join(
			connection.queryAsync('UPDATE cards SET deck_count = deck_count+1 WHERE id = ? ;', [card_id]),
			connection.queryAsync('UPDATE deck_list SET card_count = card_count+1 WHERE id = ? ;', [deck_id]),
			function(card_results, deck_results)
			{
				// Nothing to do. Database has been updated, transaction will automatically rollback if either
				// query fails
				return;
			}
		);
	}, function(err)
	{
		// Catch duplicate entry error. If we get one, that means this card is already in this deck.
		// Do not update the card's deck count or the deck's card count, just update the quantity
		if (err.code === 'ER_DUP_ENTRY')
		{
			return connection.queryAsync('UPDATE deck_descriptions SET quantity = ? WHERE card = ? AND deck = ? ;',
				[quantity, card_id, deck_id]);
		} else
		{
			throw err;
		}
	});
};

// Returns a Promise. The promise, if fulfilled, will yield an object with all cards in the
// specified decks, organized by color (Ex: {black: [], white: []})
// Card objects returned have all the fields from the `cards` MYSQL table PLUS `deck_id` and
// `deck_name`.
// Uses a MYSQL transaction
var compile_decks = function(deck_ids)
{
	return database.with_transaction(function(connection)
	{
		// Make an array of requests for cards.
		// I normally do not like to loop over MYSQL queries, but I do not expect people to add THAT many decks,
		// and I think that it is much more readable this way
		var white_card_queries = [];
		var black_card_queries = [];
		for (var i = 0; i < deck_ids.length; i++)
		{
			var query = connection.queryAsync(
				'SELECT cards.*, deck_list.id as deck_id, deck_list.name as deck_name ' +
				'FROM deck_descriptions INNER JOIN cards ON deck_descriptions.card = cards.id ' +
				'INNER JOIN deck_list ON deck_list.id = deck_descriptions.deck ' + 
				'WHERE deck_descriptions.deck = ? AND cards.color = ?; ', [deck_ids[i], card.white]).spread(function(results, fields)
				{
					return results;
				});
			white_card_queries.push(query);

			query = connection.queryAsync(
				'SELECT cards.*, deck_list.id as deck_id, deck_list.name as deck_name ' +
				'FROM deck_descriptions INNER JOIN cards ON deck_descriptions.card = cards.id ' +
				'INNER JOIN deck_list ON deck_list.id = deck_descriptions.deck ' + 
				'WHERE deck_descriptions.deck = ? AND cards.color = ?; ', [deck_ids[i], card.black]).spread(function(results, fields)
				{
					return results;
				});
			black_card_queries.push(query);
		};
		var white_card_promise = Promise.all(white_card_queries).then(function(result_arrays)
		{
			// We now have an array of arrays of cards (one array of cards per deck).
			// Concatenate them into just a single array of cards
			var all_cards = [];
			// Apply each array as an argument to `concat`
			all_cards = all_cards.concat.apply(all_cards, result_arrays);
			return all_cards;
		});
		var black_card_promise = Promise.all(black_card_queries).then(function(result_arrays)
		{
			// We now have an array of arrays of cards (one array of cards per deck).
			// Concatenate them into just a single array of cards
			var all_cards = [];
			// Apply each array as an argument to `concat`
			all_cards = all_cards.concat.apply(all_cards, result_arrays);
			return all_cards;
		});
		return Promise.join(white_card_promise, black_card_promise, function(white_cards, black_cards)
		{
			return {white: white_cards, black: black_cards};
		});
	});
};

module.exports = {
	init_db                 : init_db,
	error                   : deck_common.error,
	deck_object             : deck_common.deck_object,
	check_deck_name         : deck_common.check_deck_name,
	check_deck              : deck_common.check_deck,
	get_all_by_user_id      : get_decks_by_user_id,
	create                  : create_deck,
	get_cards               : get_cards,
	get_by_id               : get_deck_by_id,
	ensure_user_ownership   : ensure_user_ownership,
	add_card                : add_card_to_deck,
	add_card_no_transaction : add_card_to_deck_no_transaction,
	compile_decks           : compile_decks
};
