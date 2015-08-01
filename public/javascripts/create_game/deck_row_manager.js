// Requires create_game/deck_list.js
//          create_game/selected_decks.js
//          create_game/deck_row_signals.js
//
// This module maintains a list of all deck rows with add/remove buttons.
// When deck rows are created, they should be added to this module, which will
// take care of connecting their buttons to the correct signals and
// toggling the button between add and remove depending on whether the button
// is in the selected list or not. If the deck row is removed from the page,
// this module must be notified to free memory associated with that row
var deck_row_manager = {};

// Deck lists with this selector will be automatically added to the manager on
// document load
deck_row_manager.add_default_selector = '.deck_row_manager-add_list';

// This object will hold each row with the deck id of the row as a lookup key for
// an array of deck rows (as JQuery objects)
deck_row_manager.rows = {};

// Takes a selector or JQuery object. Returns true if the deck manager already
// contains this row. Must be passed only a single row.
deck_row_manager.contains = function(row)
{
	row = $(row);
	var row_id = row.data(deck_list.deck_id_data_key);

	if (!(row_id in deck_row_manager.rows))
		return false;

	// Search the list of rows with that id for one with the same node as the one passed
	var row_node = row.get(0);
	deck_row_manager.rows[row_id].for_each(function(i, deck_row)
	{
		if (deck_row.get(0) === row_node)
			return true;
	});

	return false;
};

// Can be given the selector of a row, or a selector containing multiple rows. All
// rows will be added to the deck manager
deck_row_manager.add_row = function(selector)
{
	var elements;
	if ($(selector).is(deck_list.row_selector))
		elements = $(selector);
	else
		elements = $(selector).find(deck_list.row_selector);

	elements.each(function()
	{
		var row = $(this)
		if (!deck_row_manager.contains(row))
		{
			var row_id = row.data(deck_list.deck_id_data_key);
			if (!(row_id in deck_row_manager.rows))
				deck_row_manager.rows[row_id] = [];

			deck_row_manager.rows[row_id].push(row);

			// Now the row is in the list, make sure it has the correct button and connect it to the correct signal
			if (selected_decks.contains(row_id))
				deck_row_manager.set_button_remove(row);
			else
				deck_row_manager.set_button_add(row);
		}
	});
};

// Can be given the selector of a row, or a selector containing multiple rows. All
// rows will be removed from the deck manager
// This does not remove the rows from the DOM. This typically should be done by the caller.
deck_row_manager.remove_row = function(selector)
{
	var elements;
	if ($(selector).is(deck_list.row_selector))
		elements = $(selector);
	else
		elements = $(selector).find(deck_list.row_selector);

	elements.each(function()
	{
		row = $(this);
		var row_id = row.data(deck_list.deck_id_data_key);

		if (row_id in deck_row_manager.rows)
		{
			// Remove any rows with the same node as this row
			var row_node = row.get(0);
			deck_row_manager.rows[row_id] = deck_row_manager.rows[row_id].filter(function(element, index, array)
			{
				// Filter should allow only different nodes to remain
				return element.get(0) != row_node;
			});
		}
	});
};

// Rewrites the deck row to have an add button and connects the signal for the button
// Only a single row should be passed to this function.
// If deck_object is specified, it will be used to rewrite the row. If it is not set,
// the row's information will be read from the row and rewritten to it
deck_row_manager.set_button_add = function(row, deck_object)
{
	row = $(row);
	if (!deck_object)
		deck_object = deck_list.get_deck(row);

	row.html(deck_list.make_row({
		deck          : deck_object,
		add_button    : true,
		contents_only : true
	}));
	deck_row_signals.connect_add(row);
};

// Rewrites the deck row to have a remove button and connects the signal for the button
// Only a single row should be passed to this function.
// If deck_object is specified, it will be used to rewrite the row. If it is not set,
// the row's information will be read from the row and rewritten to it
deck_row_manager.set_button_remove = function(row, deck_object)
{
	row = $(row);
	if (!deck_object)
		deck_object = deck_list.get_deck(row);

	row.html(deck_list.make_row({
		deck          : deck_object,
		remove_button : true,
		contents_only : true
	}));
	deck_row_signals.connect_remove(row);
};

// When a deck is added to the selected list, add that row to the manager and change
// all decks with the same id to have remove buttons
selected_decks.on_deck_add(function(deck_object, deck_row)
{
	deck_row_manager.add_row(deck_row);

	deck_row_manager.rows[deck_object.id].for_each(function(i, deck_row)
	{
		deck_row_manager.set_button_remove(deck_row);
	});
});

// When a deck is removed from the selected list, remove that row from the manager
// and change all decks with the same id to have add buttons
selected_decks.on_deck_remove(function(deck_object, deck_row)
{
	deck_row_manager.rows[deck_object.id].for_each(function(i, deck_row)
	{
		deck_row_manager.set_button_add(deck_row);
	});

	deck_row_manager.remove_row(deck_row);
});

$(document).ready(function()
{
	deck_row_manager.add_row(deck_row_manager.add_default_selector);
});
