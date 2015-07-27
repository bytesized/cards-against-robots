if ((typeof module) !== 'undefined')
{
	var path = require('path');
	var config = require(path.normalize(path.join(__dirname, '..', '..', '..', 'configuration')));
}

var deck = {};

deck.error = function(message, code)
{
	var error = Error.call(this, message);

	this.name = 'DeckError';
	this.message = error.message;
	this.stack = error.stack;
	this.code = code;
}
deck.error.prototype = Object.create(Error.prototype);
deck.error.prototype.constructor = deck.error;

deck.deck_object = (function() {
	// Constructor. Make sure all properties are defined and play_count and card_count
	// are set to their default values
	function deck_object()
	{
		this.id         = null;
		this.name       = null;
		this.creator    = null;
		this.play_count = 0;
		this.card_count = 0;
	};
	return deck_object;
})();

// Internal Validation functions. By specifying the validation functions in this manner,
// they can be used with express-validation, which does not support validation functions
// returning error messages.
deck.deck_name_validation_fns =
[
	{
		fn: function(deck_name)
		{
			if (deck_name.length < 4)
				return false;
			else if (config.properties.is_configured && deck_name.length > config.field_sizes.deck_name)
				return false;
			else
				return true;
		},
		msg: function(deck_name)
		{
			if (config.properties.is_configured)
				return "Deck name must be 4-" + config.field_sizes.deck_name + " characters long";
			else
				return "Deck name must be more than 4 characters long";
		}
	},
	{
		fn: function(deck_name)
		{
			if (deck_name.match(/^[-a-zA-Z0-9_+=:().&%$^* ]*$/) == null)
				return false;
			else
				return true;
		},
		msg: function(deck_name)
		{
			return "Deck name may only contain letters, numbers, spaces, and these special characters: -,_,+,=,:,(,),.,&,%,$,^,*";
		}
	}
];

// Throws an error if the deck name is invalid
// Does not check if the name already exists
deck.check_deck_name = function(candidate)
{
	for (var i = 0; i < deck.deck_name_validation_fns.length; i++)
	{
		if (!deck.deck_name_validation_fns[i].fn(candidate))
			throw new deck.error(deck.deck_name_validation_fns[i].msg(candidate), 'BAD_DECK_NAME');
	}
};

// Checks if a deck is ok to be created
// Does not check if the deck name already exists
deck.check_deck = function(candidate)
{
	deck.check_deck_name(candidate.name);
};

if ((typeof module) !== 'undefined')
	module.exports = deck;
