// Requires common/deck.js
//          deck_editor/load_deck.js
var create_deck = {};
create_deck.input_selector = '#create_deck-name_input';
create_deck.button_selector = '#create_deck-button';
create_deck.ajax_url = '/ajax/deck/create';
create_deck.max_attempts = 1;

$(document).ready(function()
{
	$(create_deck.button_selector).on('click', create_deck.on_click);

	$(create_deck.input_selector).popover({
		title: function()
		{
			return $(create_deck.input_selector).data('create_deck.message_title');
		},
		content: function()
		{
			return $(create_deck.input_selector).data('create_deck.message');
		},
		placement: 'auto',
		container: 'body',
		animation: true,
		trigger: 'manual'
	});
	$('body').on('click.create_deck', function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;

		if($(target).closest(create_deck.button_selector).length == 0)
			$(create_deck.input_selector).popover('hide');
	});
});

create_deck.on_click = function(event)
{
	event = event || window.event;
	event.preventDefault();

	var deck_name = $(create_deck.input_selector).val();
	if (!create_deck.validate(deck_name))
		return;
	create_deck.send_request(deck_name);
};

// Local validation only. Return true if deck name is valid
// If the deck name is not valid, a popover will be shown
create_deck.validate = function(deck_name)
{
	$(create_deck.input_selector).closest('.form-group').removeClass('has-error');
	$(create_deck.input_selector).closest('.form-group').removeClass('has-success');

	try
	{
		deck.check_deck_name(deck_name);
	} catch(err)
	{
		$(create_deck.input_selector).data('create_deck.message_title', 'Invalid Deck Name');
		$(create_deck.input_selector).data('create_deck.message', err.message);
		$(create_deck.input_selector).popover('show');
		$(create_deck.input_selector).closest('.form-group').addClass('has-error');
		$(create_deck.input_selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
		return false;
	}

	return true;
};

create_deck.send_request = function(deck_name, attempt)
{
	if (!attempt)
		attempt = 1;

	$(create_deck.input_selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-transfer');

	var request = $.post(create_deck.ajax_url, { name: deck_name }, null, "json");

	request.success(function(data, text_status, jqXHR)
	{
		if (data.error)
		{
			$(create_deck.input_selector).data('create_deck.message_title', 'Cannot Create Deck');
			$(create_deck.input_selector).data('create_deck.message', data.error);
			$(create_deck.input_selector).popover('show');
			$(create_deck.input_selector).closest('.form-group').addClass('has-error');
			$(create_deck.input_selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
		} else
		{
			$(create_deck.input_selector).data('create_deck.message_title', 'Success');
			$(create_deck.input_selector).data('create_deck.message', 'Deck Created');
			$(create_deck.input_selector).popover('show');
			$(create_deck.input_selector).closest('.form-group').addClass('has-success');
			$(create_deck.input_selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-ok-circle');
			load_deck.add_decks([data.deck]);
		}
	});
	request.fail(function(jqXHR, text_status, error_thrown)
	{
		if (attempt < create_deck.max_attempts)
		{
			create_deck.send_request(deck_name, attempt + 1);
			$(create_deck.input_selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-repeat');
		} else
		{
			$(create_deck.input_selector).data('create_deck.message_title', 'Error');
			$(create_deck.input_selector).data('create_deck.message', 'Error contacting the server: ' + error_thrown);
			$(create_deck.input_selector).popover('show');
			$(create_deck.input_selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
		}
	});
};
