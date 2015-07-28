// Requires two_state_machine.js
//          step1_queue & step2_queue (defined in the deck_editor page)

var load_deck = {};
$(document).ready(function()
{
	load_deck.menu_button_selector = $('#load_deck-menu_toggle');
	load_deck.menu_selector = $('#load_deck-menu');
	load_deck.ajax_url = '/ajax/deck/load';
	load_deck.default_button_html = 'Choose a deck <span class=\'caret\'></span>';
	load_deck.max_attempts = 3;

	load_deck.menu_button = $(load_deck.menu_button_selector);
	load_deck.menu = $(load_deck.menu_selector);

	load_deck.card_change_fns = [];

	// Allows a function to be ran when the cards in the loaded deck are changed
	load_deck.on_cards_changed = function(fn)
	{
		load_deck.card_change_fns.push(fn);
	};

	load_deck.notify_cards_changed = function()
	{
		for (var i = 0; i < load_deck.card_change_fns.length; i++)
			load_deck.card_change_fns[i]();
	};

	// `loaded_deck` will be a state machine, but will also have properties
	// describing the deck. 
	// Activation of the state machine indicates that a deck is loaded
	// Deactivation indicates that no deck is loaded
	load_deck.loaded_deck = new two_state_machine;
	load_deck.unload = function()
	{
		load_deck.loaded_deck.id = null;
		load_deck.loaded_deck.name = null;
		load_deck.loaded_deck.cards = [];
		load_deck.menu_button.html(load_deck.default_button_html);
		load_deck.notify_cards_changed();
	};
	load_deck.loaded_deck.on_deactivate(load_deck.unload);

	load_deck.disable = function()
	{
		load_deck.menu_button.attr('disabled', 'disabled');
	}
	load_deck.enable = function()
	{
		if (!step1_queue.is_sending() && !step2_queue.is_sending())
			load_deck.menu_button.removeAttr('disabled');
	}
	step1_queue.on_send(load_deck.disable);
	step1_queue.on_done(load_deck.enable);
	// Do not attempt to load a new deck while editing the deck in step 2
	step2_queue.on_send(load_deck.disable);
	step2_queue.on_done(load_deck.enable);

	load_deck.menu_button.popover({
		title: function()
		{
			return load_deck.menu_button.data('load_deck.message_title');
		},
		content: function()
		{
			return load_deck.menu_button.data('load_deck.message');
		},
		placement: 'auto',
		container: 'body',
		animation: true,
		trigger: 'manual'
	});

	$('body').on('click.load_deck', function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;

		if($(target).closest(load_deck.menu_selector).length == 0)
			load_deck.menu_button.popover('hide');
	});

	load_deck.add_decks = function(deck_list)
	{
		for (var i = 0; i < deck_list.length; i++)
		{
			load_deck.menu.append('<li><a href=\'#\'>' + deck_list[i].name + '</a></li>');
			var new_list_item = load_deck.menu.find('li:last-child').find('a');
			new_list_item.data('load_deck.deck_id', deck_list[i].id);
			new_list_item.on('click', load_deck.load_clicked);
		}
	};

	load_deck.load_clicked = function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;
		target = $(target);

		event.preventDefault();

		// Unload whatever was loaded already
		load_deck.loaded_deck.deactivate();

		load_deck.loaded_deck.id = target.data('load_deck.deck_id');
		load_deck.loaded_deck.name = target.text();
		load_deck.loaded_deck.cards = [];

		load_deck.menu_button.text(target.text());
		load_deck.reload();
	};

	// Deck load/reload function. Loads the deck by the id in load_deck.loaded_deck.id
	// Expects that the menu_button has been set to the name of the deck, and no caret
	// or glyphicon has been added to it yet.
	load_deck.reload = function(attempt)
	{
		if (!attempt)
			attempt = 1;

		if (attempt === 1)
			load_deck.menu_button.append(' <span class=\'glyphicon glyphicon-transfer\'></span>');

		var request = step1_queue.send(load_deck.ajax_url, { id: load_deck.loaded_deck.id });

		request.success(function(data, text_status, jqXHR)
		{
			if (data.error)
			{
				load_deck.menu_button.data('load_deck.message_title', 'Error');
				load_deck.menu_button.data('load_deck.message', data.error);
				load_deck.menu_button.popover('show');
				// deck is already deactivated, just `unload` to reset defaults
				load_deck.unload();
			} else
			{
				load_deck.menu_button.find('span.glyphicon').attr('class', 'caret');
				load_deck.loaded_deck.cards = data.cards;
				// Notify others that a deck has been loaded
				load_deck.loaded_deck.activate();
				load_deck.notify_cards_changed();
			}
		});
		request.fail(function(jqXHR, text_status, error_thrown)
		{
			if (attempt < load_deck.max_attempts && jqXHR.status != 500)
			{
				load_deck.reload(attempt + 1);
				load_deck.menu_button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-repeat');
			} else
			{
				load_deck.menu_button.data('load_deck.message_title', 'Error');
				load_deck.menu_button.data('load_deck.message', 'Error contacting the server: ' + error_thrown);
				load_deck.menu_button.popover('show');
				// deck is already deactivated, just `unload` to reset defaults
				load_deck.unload();
			}
		});
	};

	load_deck.add_cards = function(card_list)
	{
		if (load_deck.loaded_deck.is_active())
		{
			load_deck.loaded_deck.cards = load_deck.loaded_deck.cards.concat(card_list);
			load_deck.notify_cards_changed();
		}
	};
});
