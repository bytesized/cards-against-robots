// Requires create_game/deck_list.js
//          create_game/selected_decks.js
//
// Provides a simple mechanism for attaching signals from add buttons in deck rows to
// a function that adds them to the selected decks list. Deck lists that match the
// `default_add_connect_selector` will automatically be connected when the page loads
// Once a deck has been added, the add button will be replaced with a remove button
// and the appropriate signal connected
var deck_row_signals = {};

// Connects all decendents that are add buttons such that they add the card to the
// 'selected cards list' and the add button changes to a remove button
deck_row_signals.connect_add = function(selector)
{
	$(document).ready(function()
	{
		deck_row_signals._connect_add(selector);
	});
};

// Connects all decendents that are remove buttons such that they remove the card
// from the 'selected cards list' and the remove button changes to an add button
deck_row_signals.connect_remove = function(selector)
{
	$(document).ready(function()
	{
		deck_row_signals._connect_remove(selector);
	});
};

$(document).ready(function()
{
	deck_row_signals._connect_add = function(selector)
	{
		var add_button = $(selector).find(deck_list.add_button_selector);

		add_button.on('click.deck_row_signals', deck_row_signals.on_add_button_click);
	};

	deck_row_signals.on_add_button_click = function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;

		var target_row = $(target).closest(deck_list.row_selector);

		var deck = deck_list.get_deck(target_row);

		selected_decks.add(deck);
	};

	deck_row_signals._connect_remove = function(selector)
	{
		var remove_button = $(selector).find(deck_list.remove_button_selector);

		remove_button.on('click.deck_row_signals', deck_row_signals.on_remove_button_click);
	};

	deck_row_signals.on_remove_button_click = function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;

		var target_row = $(target).closest(deck_list.row_selector);

		var deck = deck_list.get_deck(target_row);

		selected_decks.remove(deck);
	};
});
