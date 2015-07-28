// Requires common/card.js
//          deck_editor/load_deck.js
//          step2_queue (defined in the deck_editor page)
//          validator.js and common/custom_validators.js
var add_card = {};
$(document).ready(function()
{
	add_card.text_input_selector = '#add_card-text_input';
	add_card.quantity_input_selector = '#add_card-quantity_input';
	add_card.button_selector = '#add_card-button';
	add_card.color_input_name = 'add_card-color_radio';
	add_card.preview_selector = '#add_card-preview';
	add_card.ajax_url = '/ajax/deck/create_add_card';
	add_card.max_attempts = 3;

	add_card.text_input = $(add_card.text_input_selector);
	add_card.quantity_input = $(add_card.quantity_input_selector);
	add_card.button = $(add_card.button_selector);
	add_card.preview = $(add_card.preview_selector);

	//- When the page loads, apply `active` class to the checked color button
	//- Bootstrap seems to recommend just adding the `active` class to the
	//- label, but when the browser autocompletes the form (for example,
	//- if you refresh the page on Firefox), this results in the wrong
	//- label being active, so the user thinks the card is one color, but
	//- the browser thinks its the other color. We can fix this problem
	//- easily but just sending a click signal to the already checked
	//- radio button to get bootstrap to update
	$('input[name=' + add_card.color_input_name + ']:checked').click();

	add_card.enable = function()
	{
		if (!step2_queue.is_sending() && load_deck.loaded_deck.is_active())
			add_card.button.removeAttr('disabled');
	};
	add_card.disable = function()
	{
		add_card.button.attr('disabled', 'disabled');
	};
	step2_queue.on_send(add_card.disable);
	step2_queue.on_done(add_card.enable);
	load_deck.loaded_deck.on_activate(add_card.enable);
	load_deck.loaded_deck.on_deactivate(add_card.disable);

	add_card.text_input.popover({
		title: function()
		{
			return add_card.text_input.data('add_card.message_title');
		},
		content: function()
		{
			return add_card.text_input.data('add_card.message');
		},
		placement: 'auto',
		container: 'body',
		animation: true,
		trigger: 'manual'
	});

	add_card.quantity_input.popover({
		title: function()
		{
			return add_card.quantity_input.data('add_card.message_title');
		},
		content: function()
		{
			return add_card.quantity_input.data('add_card.message');
		},
		placement: 'auto',
		container: 'body',
		animation: true,
		trigger: 'manual'
	});

	add_card.button.popover({
		title: function()
		{
			return add_card.button.data('add_card.message_title');
		},
		content: function()
		{
			return add_card.button.data('add_card.message');
		},
		placement: 'auto',
		container: 'body',
		animation: true,
		trigger: 'manual'
	});

	$('body').on('click.add_card', function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;

		if($(target).closest(add_card.button_selector).length == 0)
		{
			add_card.text_input.popover('hide');
			add_card.quantity_input.popover('hide');
			add_card.button.popover('hide');
		}
	});

	add_card.color_selected = function()
	{
		var color_string = $('input[name=' + add_card.color_input_name + ']:checked').val();
		if (color_string === 'black')
			return card.black;
		else
			return card.white;
	};

	// Makes a card object and populates it with user-provided values from the page
	add_card.make_card = function()
	{
		var card_object = new card.card_object();

		card_object.text = add_card.text_input.val();
		card_object.color = add_card.color_selected();
		return card_object;
	};

	add_card.update_preview = function()
	{
		var card_object = add_card.make_card();
		var deck_name = null;

		if (load_deck.loaded_deck.is_active())
			deck_name = load_deck.loaded_deck.name;

		add_card.preview.render_card(card_object, deck_name);
	};
	add_card.text_input.bind('keyup', add_card.update_preview);
	$('input[name=' + add_card.color_input_name + ']').change(add_card.update_preview);
	load_deck.loaded_deck.on_activate(add_card.update_preview);
	add_card.update_preview();

	add_card.on_click = function()
	{
		if (!load_deck.loaded_deck.is_active())
			return;

		var card_object = add_card.make_card();
		var quantity = add_card.quantity_input.val();
		var deck_id = load_deck.loaded_deck.id;

		if (!add_card.validate(card_object, quantity))
			return;

		add_card.send_request(card_object, quantity, deck_id);
	};
	add_card.button.click(add_card.on_click);

	add_card.validate = function(card_object, quantity)
	{
		add_card.text_input.closest('.form-group').removeClass('has-error');
		add_card.quantity_input.closest('.form-group').removeClass('has-error');

		try
		{
			card.check_card(card_object);
		} catch (err)
		{
			add_card.text_input.data('add_card.message_title', 'Invalid Text');
			add_card.text_input.data('add_card.message', err.message);
			add_card.text_input.popover('show');
			add_card.text_input.closest('.form-group').addClass('has-error');
			add_card.button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
			return false;
		}

		if (!validator.custom_int(quantity, { positive: true }))
		{
			add_card.quantity_input.data('add_card.message_title', 'Invalid Quantity');
			add_card.quantity_input.data('add_card.message', 'Quantity must be a positive integer');
			add_card.quantity_input.popover('show');
			add_card.quantity_input.closest('.form-group').addClass('has-error');
			add_card.button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
			return false;
		}

		return true;
	};

	add_card.send_request = function(card_object, quantity, deck_id, attempt)
	{
		if (!attempt)
			attempt = 1;

		if (attempt === 1)
			add_card.button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-transfer');

		var request = step2_queue.send(add_card.ajax_url,
			{ text: card_object.text, color: card_object.color, quantity: quantity, deck: deck_id});

		request.success(function(data, text_status, jqXHR)
		{
			if (data.error)
			{
				add_card.button.data('add_card.message_title', 'Cannot Create Deck');
				add_card.button.data('add_card.message', data.error);
				add_card.button.popover('show');
				add_card.button.closest('.form-group').addClass('has-error');
				add_card.button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
			} else
			{
				add_card.button.data('add_card.message_title', 'Success');
				add_card.button.data('add_card.message', 'Card Added');
				add_card.button.popover('show');
				add_card.button.closest('.form-group').addClass('has-success');
				add_card.button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-circle-arrow-right');
				load_deck.add_cards([data.card]);
			}
		});
		request.fail(function(jqXHR, text_status, error_thrown)
		{
			if (attempt < add_card.max_attempts && jqXHR.status != 500)
			{
				add_card.send_request(card_object, quantity, deck_id, attempt + 1);
				add_card.button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-repeat');
			} else
			{
				add_card.button.data('add_card.message_title', 'Error');
				add_card.button.data('add_card.message', 'Error contacting the server: ' + error_thrown);
				add_card.button.popover('show');
				add_card.button.find('span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
			}
		});
	};
});
