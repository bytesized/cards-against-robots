// Interfaces with the deck_list mixin in create_game.jade
// Provides selector definitions and functionality related to lists of decks
var deck_list = {};

deck_list.template_selector = '#deck_list-template';
deck_list.deck_id_data_key = 'deck_id';
// On their own, these selectors will select all of the specified element in all deck
// lists. These should be used with JQuery's `find` method to get the element with a
// row or within the entire list
deck_list.deck_name_selector = '.deck_list_text';
deck_list.card_count_selector = '.deck_list_card_count';
deck_list.row_selector = '.deck_list_item';
deck_list.remove_button_selector = '.remove_deck';
deck_list.add_button_selector = '.add_deck';

// When passed a deck row, a deck object is created with only the attributes
// stored in the deck row HTML: name, id, and card_count
deck_list.get_deck = function(deck_row)
{
	var deck_object = {};

	deck_object.name = $(deck_row).find(deck_list.deck_name_selector).text();
	deck_object.card_count = parseInt($(deck_row).find(deck_list.card_count_selector).text(), 10);
	deck_object.id = $(deck_row).data(deck_list.deck_id_data_key);

	if (typeof deck_object.id === 'number')
		deck_object.id = parseInt(deck_object.id, 10);

	return deck_object;
};

$(document).ready(function()
{
	// Load the template
	var template = $(deck_list.template_selector);

	deck_list.template = {};

	var add_button_element = template.find(deck_list.add_button_selector).closest('div.flex_noexpand');
	deck_list.template.add_button = add_button_element.outer_html();
	add_button_element.remove();

	var remove_button_element = template.find(deck_list.remove_button_selector).closest('div.flex_noexpand');
	deck_list.template.remove_button = remove_button_element.outer_html();
	remove_button_element.remove();

	var badge_element = template.find(deck_list.card_count_selector).closest('div.flex_noexpand');
	deck_list.template.badge = badge_element.outer_html();
	badge_element.remove();

	// Store template's row html, then remove the template
	deck_list.template.row = template.html();
	template.remove();

	// Makes a row
	// Possible attributes
	//  + id                 Uses this value as the deck_id data value. Note, this does not work with the
	//                       `content_only` attribute as the id is stored in the row. Therefore, `contents_only`
	//                       should not be used to change what deck is in a row.
	//  + text               Uses this value as the text value to insert as the deck name unless html is specified
	//  + html               Uses this value as the html value to insert as the deck name
	//  + badge              Uses this value for the card count badge text
	//  + deck               Shorthand for {id: deck.id, text: deck.name, badge: deck.card_count}
	//  + add_button         If true, an add button will be inserted
	//  + remove_button      If true, a remove button will be insterted
	//  + contents_only      If true, removes the row div so that the html of a row can be set to the output of
	//                       this function to change the row
	deck_list.make_row = function(attributes)
	{
		if (attributes.deck)
		{
			attributes.id = attributes.deck.id;
			attributes.text = attributes.deck.name;
			attributes.badge = attributes.deck.card_count;
		}
		var html_object = $(deck_list.template.row);
		if (attributes.html !== undefined)
			html_object.find(deck_list.deck_name_selector).html(attributes.html);
		else
			html_object.find(deck_list.deck_name_selector).text(attributes.text);

		if (attributes.id !== undefined)
			html_object.attr('data-' + deck_list.deck_id_data_key, attributes.id);

		if (attributes.badge !== undefined)
		{
			html_object.find('.flex_container').append(deck_list.template.badge);
			html_object.find(deck_list.card_count_selector).text(attributes.badge);
		}

		if (attributes.remove_button)
			html_object.find('.flex_container').prepend(deck_list.template.remove_button);

		if (attributes.add_button)
			html_object.find('.flex_container').prepend(deck_list.template.add_button);

		var html;
		if (attributes.contents_only)
			html = html_object.html();
		else
			html = html_object.outer_html();

		return html;
	};
});
