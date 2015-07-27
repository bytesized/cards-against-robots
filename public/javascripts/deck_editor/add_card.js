// Requires common/card.js
//          deck_editor/load_deck.js
//          step2_queue (defined in the deck_editor page)
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

	add_card.quantity_input = $(add_card.quantity_input_selector);
	add_card.text_input = $(add_card.text_input_selector);
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

	add_card.color_selected = function()
	{
		var color_string = $('input[name=' + add_card.color_input_name + ']:checked').val();
		if (color_string === 'black')
			return card.black;
		else
			return card.white;
	};

	add_card.update_preview = function()
	{
		var card_object = new card.card_object()
		var deck_name = null;

		if (load_deck.loaded_deck.is_active())
			deck_name = load_deck.loaded_deck.name;

		card_object.text = add_card.text_input.val();
		card_object.color = add_card.color_selected();

		add_card.preview.render_card(card_object, deck_name);
	};
	add_card.text_input.bind('keyup', add_card.update_preview);
	$('input[name=' + add_card.color_input_name + ']').change(add_card.update_preview);
	load_deck.loaded_deck.on_activate(add_card.update_preview);
	add_card.update_preview();

	add_card.on_click = function()
	{

	};
	add_card.button.click(add_card.on_click);
});
