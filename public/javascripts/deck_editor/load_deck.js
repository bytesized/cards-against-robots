var load_deck = {};
load_deck.menu_button_selector = '#load_deck-menu_toggle';
load_deck.menu_selector = '#load_deck-menu';

load_deck.cards = [];

load_deck.add_decks = function(deck_list)
{
	for (var i = 0; i < deck_list.length; i++)
	{
		$(load_deck.menu_selector).append('<li><a href=\'#\'>' + deck_list[i].name + '</a></li>');
		var new_list_item = $(load_deck.menu_selector).find('li:last-child').find('a');
		new_list_item.data('load_deck.id', deck_list[i].id);
		new_list_item.on('click', load_deck.load_clicked);
	}
};