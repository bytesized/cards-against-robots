// Requires room_socket,
//          common/card.js,
//          current_user (defined in layout.jade),
//          notification_dialog.js,
//          game/game_turn.js,
//          game/player.js,
//          html.js
var game_card = {};
game_card.hand_card_class = 'game_card-hand_card';
game_card.hand_card_selector = '.' + game_card.hand_card_class;
game_card.clickable_class = 'card_clickable';
game_card.undo_button_box_id = 'game_card-undo_button';
game_card.undo_button_box_selector = '#' + game_card.undo_button_box_id;
game_card.undo_button_selector = game_card.undo_button_box_selector + ' > a.btn';
game_card.card_number_label_class = 'game_card-number_label';
game_card.card_number_label_selector = '.' + game_card.card_number_label_class;
game_card.card_parent_classes = 'col-xs-4 col-md-3 col-lg-5ths game_turn-play_white';
game_card.hand_container_selector = '.game_card-hand_container';
game_card.czar_card_class = 'game_card-czar_card';
game_card.czar_card_selector = '.' + game_card.czar_card_class;
game_card.czar_card_group_class = 'game_card-czar_card_group';
game_card.czar_card_group_selector = '.' + game_card.czar_card_group_class;
game_card.czar_card_container_classes = {};
game_card.czar_card_container_classes.outer = [];
game_card.czar_card_container_classes.outer[1] = 'col-xs-4 col-md-3 col-lg-5ths';
game_card.czar_card_container_classes.outer[2] = 'col-xs-8 col-md-6 col-lg-2_5ths';
game_card.czar_card_container_classes.outer[3] = 'col-xs-12 col-md-9 col-lg-3_5ths';
game_card.czar_card_container_classes.inner = [];
game_card.czar_card_container_classes.inner[1] = 'col-xs-12';
game_card.czar_card_container_classes.inner[2] = 'col-xs-6';
game_card.czar_card_container_classes.inner[3] = 'col-xs-4';

game_card.black_card = null;
game_card.black_card_selector = '#game_card-black_card';

game_card.hand = [];
game_card.played = [];
game_card.undo_pending = false;
game_card.czar_cards = [];

// Called when the page is loaded and the current player has already played cards.
// Just updates internal memory to match the cards that were played; does not
// change DOM or send socket data.
game_card.load_played = function(played_list)
{
	if (played_list === null)
		return;
	$(document).ready(function()
	{
		for (var i = 0; i < played_list.length; i++)
		{
			var card = game_card.hand[played_list[i].hand_id];
			game_card.played.push(card.get_card());
		}
	});
};

$(document).ready(function()
{
	game_card.update_black_card = function()
	{
		game_card.black_card = $(game_card.black_card_selector).get_card();
		game_card.black_card.blanks = card.blank_count(game_card.black_card.text);
	};
	game_card.update_black_card();

	// Loads the cards from the DOM into `game_card.hand`
	game_card.load_hand = function()
	{
		game_card.hand = [];
		$(game_card.hand_card_selector).each(function(index)
		{
			var card_object = $(this).get_card();
			game_card.hand[card_object.hand_id] = $(this);
		});
	};
	game_card.load_hand();

	// Returns the index in the `game_card.played` array of the card.
	// If the card is not in the array, `false` is returned.
	game_card.played_index = function(hand_id)
	{
		for (var i = 0; i < game_card.played.length; i++)
		{
			if (game_card.played[i].hand_id === hand_id)
				return i;
		}
		return false;
	};

	// Play a white card on a black card
	game_card.play = function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;

		if (game_card.played.length >= game_card.black_card.blanks)
			return;

		target = $(target).closest(game_card.hand_card_selector);

		var card_object = $(target).get_card();
		if (!card_object)
			return;
		var played_index = game_card.played_index(card_object.hand_id);
		if (played_index !== false)
		{
			// An already played card has been clicked. Remove that card and all that were played after it from
			// the played list
			for (var i = played_index; i < game_card.played.length; i++)
				game_card.hand[game_card.played[i].hand_id].find('.' + game_card.card_number_label_class).remove();

			var delete_count = game_card.played.length - played_index;
			game_card.played.splice(played_index, delete_count);
		} else
		{
			// A new card has been played
			game_card.played.push(card_object);
			var card_element = game_card.hand[card_object.hand_id];
			if (game_card.black_card.blanks > 1)
			{
				card_element.append(
					'<span class=\'label label-default ' + game_card.card_number_label_class + '\' style=\'position: absolute; top: 0px; right: 0px;\'>' +
					game_card.played.length + '</span>'
					);
			}

			if (game_card.played.length === game_card.black_card.blanks)
			{
				$(game_card.hand_card_selector).removeClass(game_card.clickable_class);
				$(game_card.hand_card_selector).off('click.game_card');

				card_element.append(
					'<div id=\'' + game_card.undo_button_box_id + '\' class=\'centered_absolute\'>' +
						'<a class=\'btn btn-default\'>' +
							'<span class=\'glyphicon glyphicon-transfer\'></span> Undo' +
						'</a>' +
					'</div>'
					);
				$(game_card.undo_button_selector).on('click.game_card', game_card.unplay);

				var played_data = [];
				for (var i = 0; i < game_card.played.length; i++) {
					played_data.push({id: game_card.played[i].id, hand_id: game_card.played[i].hand_id});
				};
				room_socket.emit('play_card', played_data);
			}
		}
	};
	if (game_card.played.length < game_card.black_card.blanks)
		$(game_card.hand_card_selector).on('click.game_card', game_card.play);

	// When the room is notified of our card, change the transfer icon
	room_socket.on('play_card', function(user_id)
	{
		if (user_id === current_user.id && !game_card.undo_pending)
			$('#' + game_card.undo_button_box_id).find('.glyphicon').attr('class', 'glyphicon glyphicon-ok');
	});

	// Note, if this signal happens, it can be assumed that the user has not (successfully) played any cards,
	// since playing cards with a desynchronized hand should be detected (and corrected).
	// Therefore, `game_card.played` will be empty after this.
	room_socket.on('hand_desync', function(hand)
	{
		notification_dialog.show(
			'Hand Desynchronization', 
			'The cards in your hand do not match the ones on the server. Your hand has been updated to match the server.'
			);
		game_card.hand = [];
		game_card.played = [];

		$(game_card.hand_card_selector).parent().remove();

		var hidden_string;
		if (game_turn.turn_type === 'play_white')
			hidden_string = '';
		else
			hidden_string = 'style=\'display: none;\'';

		for (var i = 0; i < hand.length; i++)
		{
			$(game_card.hand_container_selector).append(
				'<div class=\'' + game_card.card_parent_classes + '\' ' + hidden_string + '>' +
					'<div class=\'card ' + game_card.hand_card_class + ' ' + game_card.clickable_class + '\' data-' + card.card_data_key + '="' + html.encode(JSON.stringify(hand[i])) +'">' +
					'</div>' + 
				'</div>'
				);
		}
		game_card.load_hand();
		for (var i = 0; i < game_card.hand.length; i++)
			game_card.hand[i].render_card();
		$(game_card.hand_card_selector).on('click.game_card', game_card.play);
	});

	game_card.unplay = function()
	{
		game_card.undo_pending = true;
		$('#' + game_card.undo_button_box_id).find('.glyphicon').attr('class', 'glyphicon glyphicon-transfer');
		room_socket.emit('unplay_card');
	};
	$(game_card.undo_button_selector).on('click.game_card', game_card.unplay);

	room_socket.on('unplay_card', function(user_id)
	{
		if (user_id === current_user.id)
		{
			game_card.played = [];
			game_card.undo_pending = false;
			$(game_card.card_number_label_selector).remove();
			$(game_card.undo_button_box_selector).remove();
			$(game_card.hand_card_selector).addClass(game_card.clickable_class);
			$(game_card.hand_card_selector).off('click.game_card');
			$(game_card.hand_card_selector).on('click.game_card', game_card.play);
		}
	});

	game_card.show_czar_cards = function(played_cards)
	{
		var is_czar = (player.czar === current_user.id);
		// If we are waiting for undo confirmation, it certainly isn't happening now
		game_card.undo_pending = false;

		for (var i = 0; i < played_cards.length; i++)
		{
			var player_cards = played_cards[i];
			// Add outer container
			var html_str = '<div class=\'' + game_card.czar_card_container_classes.outer[player_cards.length] + ' ' + game_card.czar_card_group_class + '\'>';
			var closing_tags = '</div>';

			// Add panel
			var div_attrs = '';
			if (player_cards.length > 1)
				div_attrs = 'class=\'card_panel\'';
			html_str += '<div ' + div_attrs + '>'
			closing_tags = '</div>' + closing_tags;
			// row...
			html_str += '<div class=\'row\'>'
			closing_tags = '</div>' + closing_tags;

			for (var j = 0; j < player_cards.length; j++)
			{
				var card_object = player_cards[j];

				// Inner container
				var card_html = '<div class=\'' + game_card.czar_card_container_classes.inner[player_cards.length] + '\'>';
				var card_closing_tags = '</div>';

				// Finally the card itself
				var card_classes = 'card ' + game_card.czar_card_class
				if (is_czar)
					card_classes += ' ' + game_card.clickable_class;
				card_html += '<div class=\'' + card_classes + '\' data-' + card.card_data_key + '="' + html.encode(JSON.stringify(card_object)) + '">';
				card_closing_tags = '</div>' + card_closing_tags;

				html_str += card_html;
				html_str += card_closing_tags;
			}
			html_str += closing_tags;
			$(game_card.hand_container_selector).append(html_str);
		}
		$(game_card.czar_card_selector).each(function(index)
		{
			$(this).render_card();
		});
		if (is_czar)
			$(game_card.czar_card_selector).on('click.game_card', game_card.choose_czar_card);
	};
	room_socket.on('all_cards_played', function(played_cards)
	{
		game_card.show_czar_cards(played_cards);
	});
	room_socket.on('czar_card_desync', function(played_cards)
	{
		notification_dialog.show(
			'Card Desynchronization', 
			'You have picked a card that does not match any user currently in the game. The cards have been resynchronized to match the cards in play.'
			);
		$(game_card.czar_card_group_selector).remove();
		game_card.show_czar_cards(played_cards);
	});
	room_socket.on('player_leave', function(data)
	{
		if (data.played_cards !== null)
		{
			$(game_card.czar_card_group_selector).remove();
			game_card.show_czar_cards(data.played_cards);
		};
	});

	game_card.choose_czar_card = function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;

		target = $(target).closest(game_card.czar_card_selector);
		var card_object = target.get_card();

		if (player.czar !== current_user.id)
			return;
		if (!card_object)
			return;

		$(game_card.czar_card_group_selector).addClass('disable_all');

		target.append(
			'<div class=\'centered_absolute\'>' +
				'<h3 style=\'margin: 0px\'><span class=\'label label-default\'>' +
					'<span class=\'glyphicon glyphicon-transfer\'></span> Submitting' +
				'</span></h3>' +
			'</div>'
			);

		room_socket.emit('choose_czar_card', card_object.player_id);
	};
	if (player.czar === current_user.id)
		$(game_card.czar_card_selector).on('click.game_card', game_card.choose_czar_card);

	game_card.next_turn = function(new_black_card, new_white_cards, new_czar)
	{
		$(game_card.czar_card_group_selector).remove();

		// Remove played cards from hand
		var index_list = [];
		for (var i = 0; i < game_card.played.length; i++)
			index_list.push(game_card.played[i].hand_id);

		// Reverse sort `index_list`. We must remove the largest ids first so the indicies
		// of the lower ids don't get changed when the cards are spliced out of the list
		index_list.sort(function(a, b) {return (b - a);});

		for (var i = 0; i < index_list.length; i++)
		{
			var index = index_list[i];
			game_card.hand[index].parent().remove();
			game_card.hand.splice(index, 1);
		}

		game_card.played = [];

		// Rewrite hand ids
		for (var i = 0; i < game_card.hand.length; i++)
		{
			var card_object = game_card.hand[i].get_card();
			card_object.hand_id = i;
			game_card.hand[i].set_card(card_object);
		}

		$(game_card.black_card_selector).set_card(new_black_card);
		game_card.update_black_card();

		if (current_user.id !== new_czar)
			$(game_card.hand_card_selector).show();

		var hidden_string;
		if (current_user.id === new_czar)
			hidden_string = 'style=\'display: none;\'';
		else
			hidden_string = '';

		$(game_card.hand_card_selector).show();
		$(game_card.hand_card_selector).each(function()
		{
			if (!$(this).is('.' + game_card.clickable_class))
				$(this).addClass(game_card.clickable_class);
		});
		for (var i = 0; i < new_white_cards.length; i++)
		{
			$(game_card.hand_container_selector).append(
				'<div class=\'' + game_card.card_parent_classes + '\' ' + hidden_string + '>' +
					'<div class=\'card ' + game_card.hand_card_class + ' ' + game_card.clickable_class + '\' data-' + card.card_data_key + '="' +
						html.encode(JSON.stringify(new_white_cards[i])) +'">' +
					'</div>' + 
				'</div>'
				);
		}
		// Reload hand and render all cards
		game_card.load_hand();
		for (var i = 0; i < game_card.hand.length; i++)
			game_card.hand[i].render_card();
		$(game_card.hand_card_selector).off('click.game_card');
		$(game_card.hand_card_selector).on('click.game_card', game_card.play);
	};
	room_socket.on('choose_czar_card', function(data)
	{
		game_card.next_turn(data.black_card, data.new_cards, data.czar);
	});
});
