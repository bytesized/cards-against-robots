// Requires create_game/deck_list.js
//          html.js
var selected_decks = {};
selected_decks.empty_list_html = '<i>No Decks Selected</i>';
selected_decks.list_selector = '#selected_decks-list';
selected_decks.input_selector = '#selected_decks-input';

selected_decks.empty_list_row_html = null;
selected_decks.decks = [];

selected_decks.is_ready = false;
selected_decks.ready_fns = [];
// Takes a function to be executed when selected_decks has been setup and the document is ready
selected_decks.ready = function(fn)
{
	if (selected_decks.is_ready)
		fn();
	else
		selected_decks.ready_fns.push(fn);
};
// Notifies functions that the module is ready. Defers running until the document is ready
selected_decks.notify_ready = function()
{
	$(document).ready(function()
	{
		selected_decks.is_ready = true;
		while (selected_decks.ready_fns.length > 0)
		{
			var fn = selected_decks.ready_fns.shift();
			fn();
		}
	})
};

// This function synchronizes the state of this module with the data in the hidden input
selected_decks.set_input_value = function()
{
	$(document).ready(function()
	{
		var selected_decks_object = [];

		selected_decks.decks.for_each(function(i, deck)
		{
			var deck_output = {};
			deck_output.id = deck.id;
			selected_decks_object.push(deck_output);
		});

		$(selected_decks.input_selector).val(JSON.stringify(selected_decks_object));
	});
};

// This function serves a number of purposes. It adds the decks given to the list and displays it
// (if there are any decks). If the list is empty, a message indicating no decks have been selected
// is displayed instead.
// Additionally, this initializes the module. Prior to this function being called, nothing is
// displayed to prevent a flash of 'no decks' followed by the decks loading
selected_decks.init = function(decks)
{
	$(document).ready(function()
	{
		if ($.isArray(decks))
			selected_decks._init(decks);
		else
			selected_decks._init([decks]);
	});
};

// Takes a deck, or an array of decks. Each deck must have a name and id property
selected_decks.add = function(decks)
{
	selected_decks.ready(function()
	{
		if ($.isArray(decks))
			selected_decks._add(decks);
		else
			selected_decks._add([decks]);
	});
};

// Removes a deck from the selected deck list.
selected_decks.remove = function(deck)
{
	selected_decks.ready(function()
	{
		selected_decks._remove(deck);
	});
};

selected_decks.on_add_fns = [];
// Any functions passed to this will be called when a deck is added with the deck object as
// the first argument and the deck row JQuery element as the second element
selected_decks.on_deck_add = function(fn)
{
	selected_decks.on_add_fns.push(fn);
};
selected_decks.notify_deck_add = function(deck_object, row_element)
{
	for (var i = 0; i < selected_decks.on_add_fns.length; i++)
		selected_decks.on_add_fns[i](deck_object, row_element);
};

selected_decks.on_remove_fns = [];
// Any functions passed to this will be called when a deck is removed with the deck object as
// an argument and the deck row JQuery element as the second element
// The deck row JQuery element will be removed from the DOM immediately after all functions
// are notified
selected_decks.on_deck_remove = function(fn)
{
	selected_decks.on_remove_fns.push(fn);
};
selected_decks.notify_deck_remove = function(deck_object, row_element)
{
	for (var i = 0; i < selected_decks.on_remove_fns.length; i++)
		selected_decks.on_remove_fns[i](deck_object, row_element);
};

// Checks to see if the specified deck is on the selected decks list
selected_decks.contains = function(deck_id)
{
	for (var i = 0; i < selected_decks.decks.length; i++)
	{
		if (selected_decks.decks[i].id === deck_id)
			return true;
	}
	return false;
};

$(document).ready(function()
{
	selected_decks.list = $(selected_decks.list_selector);

	selected_decks._init = function(decks)
	{
		// Make the empty template
		selected_decks.empty_list_row_html = deck_list.make_row({
			html: selected_decks.empty_list_html
		});

		// Make sure the list is empty
		selected_decks.list.find(deck_list.row_selector).remove();
		selected_decks.decks = [];

		// Add passed decks to the list
		selected_decks._add(decks);

		selected_decks.notify_ready();
	};

	// Adds a list of decks to those that are selected
	selected_decks._add = function(decks)
	{
		// If the count is 0, remove the 'No Decks Selected' text
		if (selected_decks.decks.length === 0)
			selected_decks.list.empty();

		for (var i = 0; i < decks.length; i++)
		{
			// Make sure we do not add the same deck twice
			if (selected_decks.contains(decks[i].id))
				continue;

			selected_decks.decks.push(decks[i]);

			var new_row = deck_list.make_row({
				deck          : decks[i],
				remove_button : true
			});
			selected_decks.list.append(new_row);
			var row = selected_decks.list.find(deck_list.row_selector).last();

			selected_decks.set_input_value();

			// Notify that the deck was added (this will cause add_remove_deck
			// to connect the remove button signal)
			selected_decks.notify_deck_add(decks[i], row);
		};

		if (selected_decks.decks.length === 0)
			selected_decks.list.html(selected_decks.empty_list_row_html);
	};

	selected_decks._remove = function(deck)
	{
		for (var i = 0; i < selected_decks.decks.length; i++)
		{
			if (selected_decks.decks[i].id === deck.id)
			{
				var row_element = selected_decks.list.find(deck_list.row_selector).eq(i);
				var removed = selected_decks.decks.splice(i, 1)[0];

				// Notify that deck was removed, then remove the row element
				selected_decks.notify_deck_remove(removed, row_element);
				row_element.remove();
				break;
			}
		};

		if (selected_decks.decks.length === 0)
			selected_decks.list.html(selected_decks.empty_list_row_html);

		selected_decks.set_input_value();
	};
});
