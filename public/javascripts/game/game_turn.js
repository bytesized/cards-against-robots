// Requires room_socket,
//          common/card.js
//          current_user (defined in layout.jade),
//          game/player.js
var game_turn = {};

game_turn.turn_types = ['play_white', 'all_played', 'card_czar_waiting', 'card_czar_playing'];
game_turn.transition_fns = {};
game_turn.turn_type = null;

game_turn.registered_fns = [];

// This should be called AFTER all `game_turn.on_turn` calls are made
game_turn.init = function(initial_turn_type)
{
	$(document).ready(function()
	{
		game_turn.transition_fns[initial_turn_type]();
	});
};

// Register a function to run when the specified turn activates
game_turn.on_turn = function(turn_type, fn)
{
	game_turn.registered_fns.push({turn_type: turn_type, fn: fn});
};
game_turn.notify_turn = function()
{
	for (var i = 0; i < game_turn.registered_fns.length; i++)
	{
		if (game_turn.registered_fns[i].turn_type === game_turn.turn_type)
			game_turn.registered_fns[i].fn();
	}
};

$(document).ready(function()
{
	// Function to be called when it becomes the current player's turn to play a white card
	game_turn.transition_to_play_white = function()
	{
		game_turn.turn_type = 'play_white';
		$('.game_turn-all_played, .game_turn-card_czar_waiting, .game_turn-card_czar_playing').filter(function(index)
		{
			return ! $(this).hasClass('.game_turn-play_white');
		}).hide();
		$('.game_turn-play_white').show();

		game_turn.notify_turn();
	};
	game_turn.transition_fns['play_white'] = game_turn.transition_to_play_white;

	// Function to be called when the current user (and all others) has played and is waiting for the card czar to pick
	game_turn.transition_to_all_played = function()
	{
		game_turn.turn_type = 'all_played';
		$('.game_turn-play_white, .game_turn-card_czar_waiting, .game_turn-card_czar_playing').filter(function(index)
		{
			return ! $(this).hasClass('.game_turn-all_played');
		}).hide();
		$('.game_turn-all_played').show();

		game_turn.notify_turn();
	};
	game_turn.transition_fns['all_played'] = game_turn.transition_to_all_played;

	// Function to be called when the current user has become the card czar and is waiting for the other players
	game_turn.transition_to_card_czar_waiting = function()
	{
		game_turn.turn_type = 'card_czar_waiting';
		$('.game_turn-play_white, .game_turn-all_played, .game_turn-card_czar_playing').filter(function(index)
		{
			return ! $(this).hasClass('.game_turn-card_czar_waiting');
		}).hide();
		$('.game_turn-card_czar_waiting').show();

		game_turn.notify_turn();
	};
	game_turn.transition_fns['card_czar_waiting'] = game_turn.transition_to_card_czar_waiting;

	// Function to be called when the current user is the card czar, the other players have played, and it is
	// the current user's turn to pick one of the played cards
	game_turn.transition_to_card_czar_playing = function()
	{
		game_turn.turn_type = 'card_czar_playing';
		$('.game_turn-play_white, .game_turn-all_played, .game_turn-card_czar_waiting').filter(function(index)
		{
			return ! $(this).hasClass('.game_turn-card_czar_playing');
		}).hide();
		$('.game_turn-card_czar_playing').show();

		game_turn.notify_turn();
	};
	game_turn.transition_fns['card_czar_playing'] = game_turn.transition_to_card_czar_playing;


	room_socket.on('all_cards_played', function(played_cards)
	{
		if (current_user.id === player.czar)
			game_turn.transition_fns['card_czar_playing']();
		else
			game_turn.transition_fns['all_played']();
	});
	room_socket.on('choose_czar_card', function(data)
	{
		if (current_user.id === data.czar)
			game_turn.transition_fns['card_czar_waiting']();
		else
			game_turn.transition_fns['play_white']();
	});

	room_socket.on('player_leave', function(data)
	{
		if (data.played_cards !== null)
		{
			// If `data.played_cards` was defined, it must be the czar's turn (it may or may not have already been)
			var czar;
			if (data.new_czar === null)
				czar = player.czar
			else
				czar = data.new_czar;
			var new_turn_type;
			if (current_user.id === czar)
				new_turn_type = 'card_czar_playing';
			else
				new_turn_type = 'all_played';
			if (new_turn_type !== game_turn.turn_type)
				game_turn.transition_fns[new_turn_type]();
		}
	});
});
