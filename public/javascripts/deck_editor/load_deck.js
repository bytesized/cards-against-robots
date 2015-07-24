// Requires step1 & step2 (defined in the deck_editor page)
var load_deck = {};
load_deck.menu_button_selector = $('#load_deck-menu_toggle');
load_deck.menu_selector = $('#load_deck-menu');
load_deck.ajax_url = '/ajax/deck/load';
load_deck.default_button_html = 'Choose a deck <span class=\'caret\'></span>';
load_deck.max_attempts = 3;

load_deck.menu_button = $(load_deck.menu_button_selector);
load_deck.menu = $(load_deck.menu_selector);

load_deck.loaded_deck = {};
// Default attributes will be set when we call `unload()`
// (just after it is defined)

load_deck.disable = function()
{
	load_deck.menu_button.attr('disabled', 'disabled');
}
load_deck.enable = function()
{
	load_deck.menu_button.removeAttr('disabled');
}
step1.on_activate(load_deck.disable);
step1.on_deactivate(load_deck.enable);
// Do not attempt to load a new deck while editing the deck in step 2
step2.on_activate(load_deck.disable);
step2.on_deactivate(load_deck.enable);

$(document).ready(function()
{
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
});

load_deck.unload = function()
{
	load_deck.loaded_deck.id = null;
	load_deck.loaded_deck.name = null;
	load_deck.loaded_deck.cards = [];
	load_deck.menu_button.html(load_deck.default_button_html);
};
// Call function immediately to set defaults
load_deck.unload();

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
	{
		load_deck.menu_button.append(' <span class=\'glyphicon glyphicon-transfer\'></span>');
		step1.activate();
		// Do not allow editing the deck while loading the deck
		step2.activate();
	}

	var request = $.post(load_deck.ajax_url, { id: load_deck.loaded_deck.id }, null, "json");

	request.success(function(data, text_status, jqXHR)
	{
		if (data.error)
		{
			load_deck.menu_button.data('load_deck.message_title', 'Error');
			load_deck.menu_button.data('load_deck.message', data.error);
			load_deck.menu_button.popover('show');
			load_deck.unload();
		} else
		{
			load_deck.menu_button.find('span.glyphicon').attr('class', 'caret');
			load_deck.loaded_deck.cards = data.cards;
		}
	});
	request.fail(function(jqXHR, text_status, error_thrown)
	{
		if (attempt < load_deck.max_attempts)
		{
			load_deck.reload(attempt + 1);
			load_deck.menu_button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-repeat');
		} else
		{
			load_deck.menu_button.data('load_deck.message_title', 'Error');
			load_deck.menu_button.data('load_deck.message', 'Error contacting the server: ' + error_thrown);
			load_deck.menu_button.popover('show');
			load_deck.unload();
		}
	});
	request.always(function()
	{
		step1.deactivate();
		step2.deactivate();
	});
};
