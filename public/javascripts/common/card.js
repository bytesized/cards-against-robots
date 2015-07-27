// Client-side requires: html.js
//                       card.css
if ((typeof module) !== 'undefined')
{
	var path = require('path');
	var config = require(path.normalize(path.join(__dirname, '..', '..', '..', 'configuration')));
}

var card = {};

// Card color will be stored as a boolean
card.black = true;
card.white = false;

card.error = function(message, code)
{
	var error = Error.call(this, message);

	this.name = 'CardError';
	this.message = error.message;
	this.stack = error.stack;
	this.code = code;
}
card.error.prototype = Object.create(Error.prototype);
card.error.prototype.constructor = card.error;

card.card_object = (function() {
	// Constructor. Make sure all properties are defined set to their default values
	function card_object()
	{
		this.id         = -1;
		this.text       = '';
		this.color      = null;
		this.creator    = -1;
		this.deck_count = 0;
		this.play_count = 0;
		this.win_count  = 0;
		this.win_ratio  = 0.0;
	};
	return card_object;
})();

// Internal Validation functions. By specifying the validation functions in this manner,
// they can be used with express-validation, which does not support validation functions
// returning error messages.
card.card_text_validation_fns =
[
	{
		fn: function(card_text)
		{
			if (card_text.length <= 0)
				return false;
			else if (config.properties.is_configured && card_text.length > config.field_sizes.card_text)
				return false;
			else
				return true;
		},
		msg: function(card_text)
		{
			if (config.properties.is_configured)
				return "Card text must be 1-" + config.field_sizes.card_text + " characters long";
			else
				return "Card text cannot be blank";
		}
	},
	{
		fn: function(card_text)
		{
			if (card_text.match(/^[-a-zA-Z0-9_+=:().&%$^* ]*$/) == null)
				return false;
			else
				return true;
		},
		msg: function(card_text)
		{
			return "Card text may only contain letters, numbers, spaces, and these special characters: -,_,+,=,:,(,),.,&,%,$,^,*";
		}
	}
];

card.card_validation_fns =
[
	{
		fn: function(card_candidate)
		{
			if (card_candidate.color === card.black || card_candidate.color === card.white)
				return true;
			else
				return false;
		},
		msg: function(card_candidate)
		{
			return "Card color must be black or white";
		}
	},
	{
		fn: function(card_candidate)
		{
			if (card_candidate.color === card.black && card.blank_count(card_candidate.text) < 1)
				return false
			else
				return true
		},
		msg: function(card_candidate)
		{
			return "Black cards must have at least one blank";
		}
	}
];

// Used for blank count with:
//     var matches = text.match(card.blank_regex);
// and used for blank replacement with:
//     card_object.text = card_object.text.replace(card.blank_regex, "$1_______");
card.blank_regex = /(^|\W)_+(?=\W|$)/g;

// Returns the number of blank spaces in the card text
card.blank_count = function(text)
{
	var matches = text.match(card.blank_regex);
	if (matches === null)
		return 0;
	else
		return matches.length;
};

// Throws an error if the card text is invalid
// Does not check if the name already exists
card.check_card_text = function(candidate)
{
	for (var i = 0; i < card.card_text_validation_fns.length; i++)
	{
		if (!card.card_text_validation_fns[i].fn(candidate))
			throw new card.error(card.card_text_validation_fns[i].msg(candidate), 'BAD_CARD_TEXT');
	}
};

// Checks to make sure a card being inserted is valid to do so
// Throws an error if not
card.check_card = function(candidate)
{
	for (var i = 0; i < card.card_validation_fns.length; i++)
	{
		if (!card.card_validation_fns[i].fn(candidate))
			throw new card.error(card.card_validation_fns[i].msg(candidate), 'BAD_CARD');
	}
	card.check_card_text(candidate.text);
};

if ((typeof module) === 'undefined')
{
	// If this is client-side...

	// Render a div as a card. If deck is null, deck text will indicate that no
	// deck is set
	jQuery.fn.render_card = function(card_object, deck)
	{
		if(card_object.color === card.black)
		{
			// If the card color is black, fix consecutive blanks and display them
			// as 7 underscores
			card_object.text = card_object.text.replace(card.blank_regex, "$1_______");
			this.attr('class', 'card card_black');
		} else {
			this.attr('class', 'card card_white');
		}

		if (deck === null)
			deck = '<i>No Deck</i>';
		else
			deck = html.encode(deck);

		this.html("<div class='card_spacer'></div><div class='card_icon'></div>" +
			"<div class='deck_name'>" + deck + "</div><span>" + 
			html.encode(card_object.text) + "</span>");

		var deck_name_div = this.find(".deck_name");
		this.find(".card_icon").hover(function()
		{
			deck_name_div.show();
		}, function()
		{
			deck_name_div.hide();
		});
	};

	// On document ready, render all cards as blanks
	$(document).ready(function()
	{
		var blank_card = new card.card_object();
		blank_card.color = card.white;
		$('.card_white').render_card(blank_card, null);
		blank_card.color = card.black;
		$('.card_black').render_card(blank_card, null);
	});
} else
{
	// If this is a node module...
	module.exports = card;
}
