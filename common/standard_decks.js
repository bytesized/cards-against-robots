"use strict";
var path = require('path');
var fs = require('fs');
var Promise = require("bluebird");
var card = require(path.normalize(path.join(__dirname, '..', 'db', 'card')));
var deck = require(path.normalize(path.join(__dirname, '..', 'db', 'deck')));

var card_json_path = path.join(__dirname, 'standard_decks.json');

// Returns a promise. If fulfilled, the standard decks will be created and added
// to the given user's decks. The deck objects for all created decks will be yielded
// as an array.
// This function should ONLY be called from within a database transaction, the connection
// to which must be passed in
var add = function(user_id, connection)
{
	var decks = JSON.parse(fs.readFileSync(card_json_path));
	var deck_promises = [];
	for (var deck_name in decks)
	{
		if (decks.hasOwnProperty(deck_name))
		{
			var new_deck = new deck.deck_object();
			new_deck.name = deck_name;
			new_deck.creator = user_id;

			var deck_promise = deck.create_with_connection(new_deck, connection).then(function(created_deck)
			{
				var card_promises = [];
				for (var i = 0; i < decks[deck_name].white.length; i++)
				{
					var new_card = new card.card_object;
					new_card.text = decks[deck_name].white[i];
					new_card.color = card.white;
					new_card.creator = user_id;

					var card_promise = card.create_with_connection(new_card, connection).then(function(created_card)
					{
						return deck.add_card_no_transaction(created_card.id, created_deck.id, 1, connection);
					});
					card_promises.push(card_promise);
				}
				for (var i = 0; i < decks[deck_name].black.length; i++)
				{
					var new_card = new card.card_object;
					new_card.text = decks[deck_name].black[i];
					new_card.color = card.black;
					new_card.creator = user_id;

					var card_promise = card.create_with_connection(new_card, connection).then(function(created_card)
					{
						return deck.add_card_no_transaction(created_card.id, created_deck.id, 1, connection);
					});
					card_promises.push(card_promise);
				}
				return Promise.all(card_promises).return(created_deck);
			});
			deck_promises.push(deck_promise);
		}
	}
	return Promise.all(deck_promises);
};

module.exports = {
	add                : add
};
