// Requires room_socket,
//          common/card.js,
//          current_user (defined in layout.jade),
//          notification_dialog.js,
//          game/game_turn.js
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

game_card.black_card = null;
game_card.black_card_selector = '#game_card-black_card';

game_card.hand = [];
game_card.played = [];
game_card.undo_pending = false;

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
					'<div id=\'' + game_card.undo_button_box_id + '\' class=\'hcentered_absolute\' style=\'bottom: 0px;\'>' +
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
			hand[i].hand_id = i;
			$(game_card.hand_container_selector).append(
				'<div class=\'' + game_card.card_parent_classes + '\' ' + hidden_string + '>' +
					'<div class=\'card ' + game_card.hand_card_class + ' ' + game_card.clickable_class + '\' data-' + card.card_data_key + '=\'' + JSON.stringify(hand[i]) +'\'>' +
					'</div>' + 
				'</div>'
				);
		};
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
});
