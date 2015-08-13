// This module provides an object that manages both white and black decks
var path = require('path');
var card = require(path.normalize(path.join(__dirname, '..', 'db', 'card')));

// Returns a shuffled copy of the given deck
shuffle = function(deck)
{
	var shuffled = [];
	// Shallow Copy deck
	var deck = deck.slice();
	for (var cards_left = deck.length; cards_left > 0; --cards_left)
	{
		var rand_index = Math.floor(Math.random() * cards_left);
		// Remove card with splice. splice returns an array containing
		// the next card to add
		var next_card = deck.splice(rand_index, 1)[0];
		shuffled.push(next_card);
	}
	return shuffled;
};

module.exports = (function() {
	// Constructor
	function smart_deck(black_cards, white_cards)
	{
		this.original_deck            = {};
		this.original_deck.white      = white_cards;
		this.original_deck.black      = black_cards;
		this.deck                     = {};
		this.deck.white               = shuffle(white_cards);
		this.deck.black               = shuffle(black_cards);
		this.discard                  = {};
		this.discard.white            = [];
		this.discard.black            = [];
	}
	smart_deck.prototype.count = function(color)
	{
		if (color === card.black)
			return this.original_deck.black.length;
		else
			return this.original_deck.white.length;
	};
	// Returns an array of (white) cards of the length specified.
	// Attempts to draw from deck. If that is insufficient, shuffles the discard back into the
	// deck. If that is insufficient, a copy of the original deck is shuffled back into the deck.
	smart_deck.prototype.deal_white = function(quantity)
	{
		if (this.deck.white.length < quantity)
		{
			this.deck.white = this.deck.white.concat(shuffle(this.discard.white));
			this.discard.white = [];
		}
		while (this.deck.white.length < quantity)
			this.deck.white = this.deck.white.concat(shuffle(this.original_deck.white));

		var delt_cards = this.deck.white.splice(0, quantity);
		return delt_cards;
	};
	// Returns a single (black) card.
	// Attempts to draw from deck. If that is insufficient, shuffles the discard back into the
	// deck. If that is insufficient, a copy of the original deck is shuffled back into the deck.
	smart_deck.prototype.deal_black = function()
	{
		if (this.deck.black.length < 1)
		{
			this.deck.black = this.deck.black.concat(shuffle(this.discard.black));
			this.discard.black = [];
		}
		if (this.deck.black.length < 1)
			this.deck.black = this.deck.black.concat(shuffle(this.original_deck.black));

		var delt_card = this.deck.black.shift();
		return delt_card;
	};
	return smart_deck;
})();
