// Requires common/card.js
//          deck_editor/load_deck.js
//          step2 (defined in the deck_editor page)
var add_card = {};
add_card.text_input_selector = '#add_card-text_input';
add_card.quantity_input_selector = '#add_card-quantity_input';
add_card.button_selector = '#add_card-button';
add_card.color_input_name = 'add_card-color_radio';
add_card.ajax_url = '/ajax/deck/create_add_card';
add_card.max_attempts = 3;

add_card.quantity_input = $(add_card.quantity_input_selector);
add_card.text_input = $(add_card.text_input_selector);
add_card.button = $(add_card.button_selector);

add_card.enable = function()
{
	if (!step2.is_active() && load_deck.loaded_deck.is_active())
		add_card.button.removeAttr('disabled');
};
add_card.disable = function()
{
	add_card.button.attr('disabled', 'disabled');
};

step2.on_activate(add_card.disable);
step2.on_deactivate(add_card.enable);
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
