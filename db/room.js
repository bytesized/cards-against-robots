"use strict";
// This module provides functionality related to the room each game is allocated
var path = require('path');
var Promise = require('bluebird');
var validator = require('validator');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var deck = require(path.join(__dirname, 'deck'));
var user = require(path.join(__dirname, 'user'));
var card = require(path.join(__dirname, 'card'));
var html = require(path.normalize(path.join(__dirname, '..', 'common', 'html')));
var random = require(path.normalize(path.join(__dirname, '..', 'common', 'random')));
var io_common = require(path.normalize(path.join(__dirname, '..', 'common', 'socket_io')));
var room_name = require(path.normalize(path.join(__dirname, '..', 'common', 'room_name')));
var smart_deck = require(path.normalize(path.join(__dirname, '..', 'common', 'smart_deck')));
var room_common = require(path.normalize(path.join(__dirname, '..', 'public', 'javascripts', 'common', 'room')));

// This object will have room-id keys with room object values
var rooms = {};
// This list will keep track of all room ids currently in use. This will be exposed to other
// modules to allow iteration over rooms, but should be considered READ-ONLY
var room_ids = [];
// This object will have user-id keys pointing to room object ids
var user_rooms = {};
// An object for looking up rooms
var room_lookup = {};

var room_io = io_common.io().of('/room');

// Validates the username field of the given request
var validate_room_name_field = function(req, field)
{
	for (var i = 0; i < room_common.room_name_validation_fns.length; i++)
		req.checkBody(field, room_common.room_name_validation_fns[i].msg(req.body[field])).custom_fn(room_common.room_name_validation_fns[i].fn);
};

// Validates the password field of the given request
var validate_password_field = function(req, field)
{
	for (var i = 0; i < room_common.password_validation_fns.length; i++)
		req.checkBody(field, room_common.password_validation_fns[i].msg(req.body[field])).custom_fn(room_common.password_validation_fns[i].fn);
};

// Validates the objective field of the given request
var validate_objective_field = function(req, field)
{
	for (var i = 0; i < room_common.objective_validation_fns.length; i++)
		req.checkBody(field, room_common.objective_validation_fns[i].msg(req.body[field])).custom_fn(room_common.objective_validation_fns[i].fn);
};

// Validates the hand size field of the given request
var validate_hand_size_field = function(req, field)
{
	for (var i = 0; i < room_common.hand_size_validation_fns.length; i++)
		req.checkBody(field, room_common.hand_size_validation_fns[i].msg(req.body[field])).custom_fn(room_common.hand_size_validation_fns[i].fn);
};

// Validates the max players field of the given request
var validate_max_players_field = function(req, field)
{
	for (var i = 0; i < room_common.max_players_validation_fns.length; i++)
		req.checkBody(field, room_common.max_players_validation_fns[i].msg(req.body[field])).custom_fn(room_common.max_players_validation_fns[i].fn);
};

// Validates the redraws field of the given request
var validate_redraws_field = function(req, field)
{
	for (var i = 0; i < room_common.redraws_validation_fns.length; i++)
		req.checkBody(field, room_common.redraws_validation_fns[i].msg(req.body[field])).custom_fn(room_common.redraws_validation_fns[i].fn);
};

// Validates the decks field of the given request
// Does not check if there are enough black cards selected
var validate_decks_field = function(req, field)
{
	var decks
	try
	{
		decks = JSON.parse(req.body[field]);
	} catch(err)
	{
		decks = [];
	}
	for (var i = 0; i < room_common.decks_validation_fns.length; i++)
		req.checkBody(field, room_common.decks_validation_fns[i].msg(decks)).custom_fn(
			room_common.decks_validation_fns[i].fn, {override_param: decks}
			);
};

// The deck is passed in as a JSON object. To prevent undesired data being sent in
// maliciously, sanitize the deck by type checking and copying out the exact values
// that we want
// If sanitizing is not possible, an error will be thrown
var sanitize_decks = function(dirty_decks)
{
	var clean_decks = [];
	for (var i = 0; i < dirty_decks.length; i++)
	{
		var clean_deck = {};

		if (!(typeof dirty_decks[i].id === 'number'))
			throw new room_common.error('ID could not be sanitized', 'BAD_DECK_ATTR');

		clean_deck.id = dirty_decks[i].id;
		clean_decks.push(clean_deck);
	}
	return clean_decks;
};

// Sets the timer for the room using the time stored in `config.player_timeout`
// If the room has not started yet, the players will be notified that the timer has been reset
var reset_timer = function(room_id)
{
	var room = get_room_by_id(room_id);
	if (!room)
		return;

	if (room.timer)
		clearTimeout(room.timer);
	room.timer_expiration = Date.now() + config.player_timeout;
	room.timer = setTimeout(timeout_expired, config.player_timeout, room_id);

	if (!room.started)
		room_io.to(room_id).emit('reset_timer');
};
room_io.on('connection', function(socket)
{
	socket.on('reset_timer', function(msg)
	{
		var user_id = socket.request.user.id;
		var room_id = get_user_room(user_id);
		if (room_id === undefined)
			return;
		var room = get_room_by_id(room_id);

		if (!room.started && room.host === user_id)
			reset_timer(room_id);
	});
});

// Called when the timeout expires for a room. If the game has started, any players
// that are being waited for are kicked. If the game is not started, all players are
// kicked and the room is closed.
var timeout_expired = function(room_id)
{
	var room = get_room_by_id(room_id);
	if (!room)
		return;

	if (room.started)
	{
		// Find out who the room is waiting on and kick them!
		if (room.current_game.waiting_for_players)
		{
			// Kick all players who haven't played
			// First send all signals, then kick all players
			var players_to_kick = [];
			for (var i = 0; i < room.player_list.length; i++)
			{
				var user_object = room.players[room.player_list[i]];
				if (user_object.id !== room.current_game.czar)
				{
					if (user_object.current_game.played_cards === null ||
						user_object.current_game.played_cards.length < room.current_game.black_card.blank_count)
					{
						// Kick the player
						if (user_object.socket)
							user_object.socket.emit('timeout_expired');
						players_to_kick.push(user_object.id);
					}
				}
			}
			for (var i = 0; i < players_to_kick.length; i++)
			{
				var user_object = room.players[players_to_kick[i]];
				leave_room(user_object.id);
			}
		} else
		{
			// Kick the czar
			var user_id = room.current_game.czar;
			var user_object = room.players[user_id];
			if (user_object.socket)
				user_object.socket.emit('timeout_expired');
			leave_room(user_object.id);
		}

		reset_timer(room_id);
	} else
	{
		// If the room has not started and the timer expires, close the room.
		room_io.to(room_id).emit('timeout_expired');
		close_room(room_id);
	}
};

// Attempts to create a room. Returns a Promise. The promise may be rejected
// with a room error if, for example, there are no cards of either color in
// the selected decks
// The promise will yield the initialized room_object
var create_room = function(room_object)
{
	room_object.started = false;

	// Compile a list of deck ids from the list of decks
	var deck_ids = [];
	for (var i = 0; i < room_object.decks.length; i++)
		deck_ids.push(room_object.decks[i].id);
	return deck.compile_decks(deck_ids).then(function(cards)
	{
		if (cards.black.length === 0)
			throw new room_common.error('Selected decks have no black cards', 'INSUFFICIENT_CARDS');
		if (cards.white.length === 0)
			throw new room_common.error('Selected decks have no white cards', 'INSUFFICIENT_CARDS');
		room_object.deck = new smart_deck(cards.black, cards.white);

		return user.get_by_id(room_object.host);
	}).then(function(user_object)
	{
		room_object.players = {};
		room_object.players[user_object.id] = user_object;
		room_object.player_list = [user_object.id];

		room_object.id = room_name.get();
		if (rooms[room_object.id])
			throw new room_common.error('Room ID generated is already in use', 'INTERNAL_ERROR');

		// Room is ready, just insert it
		room_ids.unshift(room_object.id);
		rooms[room_object.id] = room_object;
		user_rooms[room_object.host] = room_object.id;
		var lookup_id = room_object.id.toLowerCase();
		if (!room_lookup[lookup_id])
			room_lookup[lookup_id] = [];
		room_lookup[lookup_id].push(room_object.id);

		reset_timer(room_object.id);

		return room_object;
	});
};

// Returns the room with the given id. Will return `undefined` if no such room
// currently exists
var get_room_by_id = function(id)
{
	return rooms[id];
};

// Returns the room id for the room that the user with the given user id is in.
// Will return `undefined` if the user is not in a room
var get_user_room = function(user_id)
{
	return user_rooms[user_id];
};

// Returns the player object. If `active_only` is true, the waiting players are not
// searched. Returns null if the player is not found
var get_player = function(player_id, room_id, active_only)
{
	var room = get_room_by_id(room_id);
	if (room.players[player_id])
		return room.players[player_id];

	if (active_only)
		return null;

	if (room.waiting_players[player_id])
		return room.waiting_players[player_id];

	return null;
};

// Causes the user specified to leave the room
// Does not send a signal to the user who is leaving (as their socket will have been
// removed from the room)
var leave_room = function(user_id)
{
	var room_id = user_rooms[user_id];
	if (room_id === undefined)
		return;
	var room = rooms[room_id];
	if (room === undefined)
	{
		delete user_rooms[user_id];
		return;
	}

	// The data object that will be sent to the clients to notify that a player has left
	var socket_data_object = {};
	socket_data_object.player = user_id;
	socket_data_object.username = '';
	socket_data_object.active_player = false;
	socket_data_object.fatal = false;
	socket_data_object.new_czar = null;
	socket_data_object.new_czar_username = null;
	socket_data_object.played_cards = null;
	socket_data_object.new_host = null;


	var active_player_index;
	if(room.players[user_id])
	{
		if (room.players[user_id].socket !== undefined)
		{
			room.players[user_id].socket.leave(room_id);
			delete room.players[user_id].socket;
		}
		socket_data_object.username = room.players[user_id].username;
		delete room.players[user_id];
		active_player_index = room.player_list.indexOf(user_id);
		room.player_list.splice(active_player_index, 1);
		socket_data_object.active_player = true;
	} else if (room.waiting_players[user_id])
	{
		if (room.waiting_players[user_id].socket !== undefined)
		{
			room.waiting_players[user_id].socket.leave(room_id);
			delete room.waiting_players[user_id].socket;
		}
		socket_data_object.username = room.waiting_players[user_id].username;
		delete room.waiting_players[user_id];
		var list_index = room.waiting_list.indexOf(user_id);
		room.waiting_list.splice(list_index, 1);
	}

	delete user_rooms[user_id];

	if (room.started)
	{
		if (room.player_list.length < 3)
		{
			socket_data_object.fatal = true;
			clean_up_game(room_id);
		} else
		{
			// If the person who left was the czar, pick a new czar
			var leaving_user_was_czar = false;
			if (room.current_game.czar === user_id)
			{
				leaving_user_was_czar = true;
				var old_czar = room.current_game.czar;
				// To pick the czar, use the same index as the old czar, who has now been removed
				// This will be the next person
				var new_czar_index = active_player_index % room.player_list.length;
				var new_czar = room.player_list[new_czar_index];
				room.current_game.czar = new_czar;
				socket_data_object.new_czar = new_czar;
				var new_czar_object = room.players[new_czar];
				socket_data_object.new_czar_username = new_czar_object.username;
				// 'un-play' any cards the new card czar played
				// Note: if it is the czar's turn, we will later need to remove the cards from
				// `room.current_game.played` as well
				new_czar_object.current_game.played_cards = null;
			}
			// Three cases to handle when someone leaves mid-game:
			// 1) The person who left was the czar and it was their turn to pick a card. To fix this, we must
			//    remove the new czar's card(s) from the played list.
			// 2) The person who left was not the czar, but it was the czar's turn. That person's played cards
			//    must be removed from the played cards for the room
			// 3) It was not the czar's turn, but the person who left was the only person that still needed to
			//    play, or similarly, the only person who still needed to play was the person who just became
			//    the new czar. This means that we need to start the czar's turn
			// There is still one remaining case:
			//  - It was not the czar's turn, and it still isn't
			// In this case, there is really nothing to handle. The game will continue as usual without the
			// player that left.
			if (!room.current_game.waiting_for_players)
			{
				var player_remove_played; // Whose played cards are being removed
				if (leaving_user_was_czar)
				{
					// Case 1 - Remove new czar's played cards
					player_remove_played = room.current_game.czar;
				} else
				{
					// Case 2 - Remove leaving user's played cards
					player_remove_played = user_id;
				}
				// Find user's played cards
				var index = undefined;
				for (var i = 0; i < room.current_game.played.length; i++)
				{
					if (room.current_game.played[i].player === player_remove_played)
					{
						index = i;
						break;
					}
				}
				// Remove played cards from list
				if (index !== undefined)
					room.current_game.played.splice(index, 1);
				// Compile just the cards to send to clients for display
				socket_data_object.played_cards = [];
				for (var i = 0; i < room.current_game.played.length; i++)
				{
					var player_cards = room.current_game.played[i].cards;
					var card_objects = [];
					for (var j = 0; j < player_cards.length; j++)
					{
						card_objects[j] = player_cards[j].card_object;
						card_objects[j].player_id = room.current_game.played[i].player_id;
					}
					socket_data_object.played_cards[i] = card_objects;
				}
			} else
			{
				if (all_played(room_id))
				{
					// Case 3
					socket_data_object.played_cards = start_czar_turn(room_id, {return_cards: true});
				}
			}
		}
	}

	if (room.player_list.length === 0 && room.waiting_list.length === 0)
	{
		close_room(room_id);
	} else
	{
		if (room.host === user_id)
		{
			room.host = room.player_list[0];
			socket_data_object.new_host = room.host;
		}

		room_io.to(room_id).emit('player_leave', socket_data_object);
	}
};

var close_room = function(room_id)
{
	var room = get_room_by_id(room_id);
	if (room === undefined)
		return;

	for (var i = 0; i < room.player_list.length; i++)
		leave_room(room.player_list[i]);
	for (var i = 0; i < room.waiting_list.length; i++)
		leave_room(room.waiting_list[i]);

	room_ids.splice(room_ids.indexOf(room_id), 1);
	delete rooms[room_id];
	room_name.release(room_id);
	var lookup_id = room_id.toLowerCase();
	delete room_lookup[lookup_id];
};

// Will throw an error if the room cannot be joined
// Does not reset the timer simply because the timer is reset whenever the waiting
// room is loaded (which already happens when the room is joined)
var join_room = function(user_object, room_id)
{
	if (!rooms[room_id])
		throw new room_common.error('No such room', 'BAD_ROOM');
	var room = get_room_by_id(room_id);
	if (room.player_list.length + room.waiting_list.length >= room.max_players)
		throw new room_common.error('That room is full', 'ROOM_FULL');

	if (user_rooms[user_object.id] !== undefined)
		leave_room(user_object.id);

	var waiting;
	if (room.started)
	{
		room.waiting_list.push(user_object.id);
		room.waiting_players[user_object.id] = user_object;
		waiting = true;
	} else
	{
		room.player_list.push(user_object.id);
		room.players[user_object.id] = user_object;
		waiting = false;
	}
	user_rooms[user_object.id] = room_id;

	var safe_user_object = {
		id       : user_object.id,
		username : user_object.username,
	};
	room_io.to(room_id).emit('player_join', {user: safe_user_object, waiting: waiting});
};

// Returns null if the lookup failed, otherwise returns the correct id from the
// lookup id
var lookup_room = function(lookup_id)
{
	lookup_id = lookup_id.toLowerCase();
	if (!room_lookup[lookup_id])
		return null;
	else if (room_lookup[lookup_id].length !== 1)
		return null;
	else
		return room_lookup[lookup_id][0];
};

// Returns true if the user is in room.players. Returns false if the user is
// a waiting player or not a player in the room at all
var active_player = function(user_id, room_id)
{
	if (rooms[room_id].players[user_id])
		return true;
	else
		return false;
};

var connect_socket = function(user_id, socket)
{
	var room_id = get_user_room(user_id);
	if (room_id === undefined)
		return;

	var room = get_room_by_id(room_id);
	var user_object = get_player(user_id, room_id);
	if (user_object.socket)
	{
		try
		{
			user_object.socket.emit('dup_connection');
			user_object.socket.leave(room_id);
			user_object.socket.disconnect(true);
		} catch (err)
		{
			// Just in case, catch errors from the socket not being valid anymore. If
			// it is not valid, the socket is not in the room, so we are done
		}
	}
	user_object.socket = socket;
	socket.join(room_id);
};
// Connect socket.io to this function
room_io.on('connection', function(socket)
{
	connect_socket(socket.request.user.id, socket);
});

var handle_chat_msg = function(user, msg)
{
	var room_id = get_user_room(user.id);
	var room = get_room_by_id(room_id);
	var msg_object = {type: 'chat', user_id: user.id, username: user.username, text: msg};

	reset_timer(room_id);
	room.chat.push(msg_object);
	room_io.to(room_id).emit('chat', msg_object);
};
// Connect socket.io to this function
room_io.on('connection', function(socket)
{
	socket.on('chat', function(msg)
	{
		handle_chat_msg(socket.request.user, msg);
	});
});

var kick_user = function(to_kick, kicker)
{
	var room_id = get_user_room(kicker);
	if (!room_id)
		return;
	var room = get_room_by_id(room_id);

	if (kicker !== room.host)
	{
		// LOGGING
		console.log('Prevented non-host from kicking a player!');
		return;
	}

	var user_object = get_player(to_kick, room_id);
	if (user_object.socket)
		user_object.socket.emit('kick');
	leave_room(to_kick);
};
// Connect socket.io to this function
room_io.on('connection', function(socket)
{
	socket.on('kick', function(user_id)
	{
		if (!validator.isInt(user_id, 10))
			return;
		user_id = validator.toInt(user_id, 10);
		kick_user(user_id, socket.request.user.id);
	});
});

var start_game = function(room_id)
{
	var room = get_room_by_id(room_id);
	if (!room || room.started === true)
		return;

	room.started = true;
	room.current_game = {};
	room.current_game.played = [];
	var player_count = room.player_list.length;

	// Pick a Card Czar
	var czar_index = Math.floor(Math.random() * player_count);
	room.current_game.czar = room.player_list[czar_index];
	room.current_game.black_card = room.deck.deal_black();
	room.current_game.black_card.blank_count = card.blank_count(room.current_game.black_card.text);

	// If the black card has three blanks, everyone but the czar starts with +2 cards
	var extra_cards = 0;
	if (card.blank_count(room.current_game.black_card.text) === 3)
		extra_cards = 2;

	for (var i = 0; i < player_count; i++)
	{
		var player = room.players[room.player_list[i]];
		player.current_game = {};
		if (player.id === room.current_game.czar)
			player.current_game.hand = room.deck.deal_white(room.hand_size);
		else
			player.current_game.hand = room.deck.deal_white(room.hand_size + extra_cards);
		player.current_game.score = 0;
		player.current_game.redraws = room.redraws;
		player.current_game.played_cards = null;
	};

	// We are always either waiting for players or waiting for the card czar
	room.current_game.waiting_for_players = true;

	reset_timer(room_id);

	room_io.to(room_id).emit('start_game');
};
// Starts the game that belongs to the host with the given user id
var start_host_game = function(user_id)
{
	var room_id = get_user_room(user_id);
	if (!room_id)
		return;
	var room = get_room_by_id(room_id);
	if (user_id !== room.host)
		return

	return start_game(room_id);
};
room_io.on('connection', function(socket)
{
	socket.on('start_game', function()
	{
		start_host_game(socket.request.user.id);
	});
});

// Plays a card (or cards) if a card may be played now by that user. If the card's id does not match
// its hand id, a signal will be emitted to the player to cause a card refresh
var play_card = function(card_list, user_id)
{
	var room_id = get_user_room(user_id);
	if (room_id === undefined)
		return;
	var room = get_room_by_id(room_id);
	if (!room.started)
		return;
	var user_object = room.players[user_id];
	if (!user_object)
		return;
	var played_card_list = [];

	// A few checks before we 'play' the card to make sure the user can play a card now
	if (user_id === room.current_game.czar)
		return;
	if (!room.current_game.waiting_for_players)
		return;

	// Validate cards
	for (var i = 0; i < card_list.length; i++)
	{
		var card_object = user_object.current_game.hand[card_list[i].hand_id];
		if (!card_object || card_object.id !== card_list[i].id)
		{
			// The card submitted is invalid, refresh the user's cards
			if (user_object.socket)
			{
				var hand = [];
				for (var i = 0; i < user_object.current_game.hand.length; i++)
				{
					hand[i] = {
						id: user_object.current_game.hand[i].id,
						text: user_object.current_game.hand[i].text,
						color: user_object.current_game.hand[i].color,
						deck_name: user_object.current_game.hand[i].deck_name,
						hand_id: i
					};
				}

				user_object.socket.emit('hand_desync', hand);
			}
			reset_timer(room_id);
			return;
		}

		played_card_list.push({id: card_list[i].id, hand_id: card_list[i].hand_id});
	}

	if (played_card_list.length !== room.current_game.black_card.blank_count)
		return;

	user_object.current_game.played_cards = played_card_list;

	if (all_played(room_id))
	{
		// Don't bother resetting the timer here, it will be reset when the czar's turn starts
		start_czar_turn(room_id);
	} else
	{
		reset_timer(room_id);
		room_io.to(room_id).emit('play_card', user_id);
	}
};
room_io.on('connection', function(socket)
{
	socket.on('play_card', function(card_list)
	{
		for (var i = 0; i < card_list.length; i++)
		{
			if (typeof card_list[i].id !== 'number')
				return;
			if (typeof card_list[i].hand_id !== 'number')
				return;
		}
		play_card(card_list, socket.request.user.id);
	});
});

// Returns `true` if all active players in the room have played and `false` if they have not
// Returns `null` if the room does not exist
var all_played = function(room_id)
{
	var room = get_room_by_id(room_id);
	if (room === undefined || !room.started)
		return null;

	for (var i = 0; i < room.player_list.length; i++)
	{
		if (room.players[room.player_list[i]].id !== room.current_game.czar)
		{
			if (room.players[room.player_list[i]].current_game.played_cards === null ||
				room.players[room.player_list[i]].current_game.played_cards.length < room.current_game.black_card.blank_count)
			{
				return false;
			}
		}
	}
	return true;
};

// Ends the players' turn to play white cards and starts the czar's turn to choose
// `options.return_cards` can be set to true to prevent the socket from sending the
// cards via socket in favor of just returning them
var start_czar_turn = function(room_id, options)
{
	if (!options)
		options = {};
	var room = get_room_by_id(room_id);
	if (room === undefined || !room.started)
		return;

	// We are now waiting for the czar
	room.current_game.waiting_for_players = false;

	// Compile played cards. For each set of cards, we need to know who played them
	// and what the cards are. For each card, we need enough card object to display it
	// and the hand id so we can find it in the player's hand later
	room.current_game.played = [];
	for (var i = 0; i < room.player_list.length; i++) // For each player...
	{
		var player_object = room.players[room.player_list[i]];
		if (player_object.id !== room.current_game.czar)
		{
			var played_object = {};
			played_object.player = player_object.id;
			played_object.cards = [];
			var player_cards = player_object.current_game.played_cards;
			for (var j = 0; j < player_cards.length; j++) // For each card played by this player...
			{
				var card_object = player_object.current_game.hand[player_cards[j].hand_id];
				var bare_card = {
					id        : card_object.id,
					color     : card_object.color,
					text      : card_object.text,
					deck_name : card_object.deck_name
				};
				played_object.cards[j] = {
					hand_id: player_cards[j].hand_id,
					card_object: bare_card
				};
			}
			room.current_game.played.push(played_object);
		}
	}

	// Shuffle the player order of the played cards
	room.current_game.played = random.shuffle(room.current_game.played);

	// Compile just the cards to send to clients for display
	// Also, add the player id to all cards
	var played_cards = [];
	for (var i = 0; i < room.current_game.played.length; i++)
	{
		// By assigning each set of cards a player id (rather than just using the index),
		// we ensure that if a player leaves, shifting the indicies, that the player ids
		// remain unchanged
		room.current_game.played[i].player_id = i;
		var player_cards = room.current_game.played[i].cards;
		var card_objects = [];
		for (var j = 0; j < player_cards.length; j++)
		{
			card_objects[j] = player_cards[j].card_object;
			card_objects[j].player_id = room.current_game.played[i].player_id;
		}
		played_cards[i] = card_objects;
	}

	reset_timer(room_id);

	if (options.return_cards)
		return played_cards
	else
		room_io.to(room_id).emit('all_cards_played', played_cards);
};

// Unplays all cards played by the current user
var unplay_cards = function(user_id)
{
	var room_id = get_user_room(user_id);
	if (room_id === undefined)
		return;
	var room = get_room_by_id(room_id);
	if (!room.started)
		return;
	var user_object = room.players[user_id];

	// A few checks to make sure we *can* 'unplay' the card
	if (user_id === room.current_game.czar)
		return;
	if (!room.current_game.waiting_for_players)
		return;

	user_object.current_game.played_cards = null;
	reset_timer(room_id);
	room_io.to(room_id).emit('unplay_card', user_id);
};
room_io.on('connection', function(socket)
{
	socket.on('unplay_card', function()
	{
		unplay_cards(socket.request.user.id);
	});
});

// Returns the played object with the specified player id
// If none can be found, null is returned
var get_played_by_id = function(room_id, player_id)
{
	var room = get_room_by_id(room_id);
	if (!room || !room.started)
		return null;

	// Check the played item with the same index as player id. This should be the right location unless
	// a user left, causing the indicies to shift
	if (room.current_game.played[player_id] && room.current_game.played[player_id].player_id === player_id)
		return room.current_game.played[player_id];

	// If we didn't find it there, seach the rest of the array
	for (var i = 0; i < room.current_game.played.length; i++)
	{
		if (room.current_game.played[i].player_id === player_id)
			return room.current_game.played[i];
	}
	return null;
};

// Chooses a winning card and either starts the next turn or ends the game
var choose_czar_card = function(player_id, user_id)
{
	var room_id = get_user_room(user_id);
	if (room_id === undefined)
		return;
	var room = get_room_by_id(room_id);
	if (!room.started)
		return;

	if (user_id !== room.current_game.czar)
		return;

	var win_object = get_played_by_id(room_id, player_id);
	if (!win_object)
	{
		// Looks like a card was chosen from a player that already left.
		// Better inform the czar that they need to re-pick
		if (room.players[user_id].socket)
		{
			// Compile just the cards to send to clients for display
			var played_cards = [];
			for (var i = 0; i < room.current_game.played.length; i++)
			{
				var player_cards = room.current_game.played[i].cards;
				var card_objects = [];
				for (var j = 0; j < player_cards.length; j++)
					card_objects[j] = player_cards[j].card_object;
				played_cards[i] = card_objects;
			}
			room.players[user_id].socket.emit('czar_card_desync', played_cards);
		}
		reset_timer(room_id);
		return;
	}

	var winner = win_object.player;
	var winner_object = room.players[winner];
	++winner_object.current_game.score;

	// Build the notification string
	var notify_string = '<i><b>' + html.encode(winner_object.username) + '</b> won: ';
	var blank_index = 0;
	var completed_text = room.current_game.black_card.text.replace(card.blank_regex, function(match, capture_group_1)
	{
		var replacement = capture_group_1 + '<u>' + win_object.cards[blank_index].card_object.text + '</u>';
		++blank_index;
		return replacement;
	});
	notify_string += '&quot;' + completed_text + '&quot;</i>';
	var msg = {type: 'html_notification', text: notify_string, no_notify: true};
	room.chat.push(msg);

	// Don't bother resetting the timer here, both of the following functions do it anyways
	if (winner_object.current_game.score >= room.objective)
		end_game(room_id, winner_object.id, msg);
	else
		next_turn(room_id, winner_object.id, msg);
};
room_io.on('connection', function(socket)
{
	socket.on('choose_czar_card', function(player_id)
	{
		if (typeof player_id === 'number')
			choose_czar_card(player_id, socket.request.user.id);
	});
});

var next_turn = function(room_id, winner, win_msg)
{
	var room = get_room_by_id(room_id);
	if (room === undefined || !room.started)
		return;

	room.current_game.waiting_for_players = true;
	room.current_game.played = [];

	// How many cards to deal to replace the cards played
	var replacement_cards;
	if (room.current_game.black_card.blank_count === 1)
		replacement_cards = 1;
	else if (room.current_game.black_card.blank_count === 2)
		replacement_cards = 2;
	else if (room.current_game.black_card.blank_count === 3)
		replacement_cards = 1;

	// Pick a new black card
	room.current_game.black_card = room.deck.deal_black();
	room.current_game.black_card.blank_count = card.blank_count(room.current_game.black_card.text);
	// And make the bare version to send via socket
	var bare_black_card = {
		id: room.current_game.black_card.id,
		color: room.current_game.black_card.color,
		text: room.current_game.black_card.text,
		deck_name: room.current_game.black_card.deck_name
	};

	// If the new black card has three blanks, deal everyone an extra 2 cards
	var extra_cards;
	if (room.current_game.black_card.blank_count === 3)
		extra_cards = 2;
	else
		extra_cards = 0;

	// Pick a new card czar
	var old_czar = room.current_game.czar;
	var new_czar_index = (room.player_list.indexOf(old_czar) + 1) % room.player_list.length;
	var new_czar = room.player_list[new_czar_index];
	room.current_game.czar = new_czar;

	// Data object to be sent to players
	var data_object = {
		winner: winner,
		msg: win_msg,
		black_card: bare_black_card,
		czar: room.current_game.czar
	};

	for (var i = 0; i < room.player_list.length; i++)
	{
		var player_object = room.players[room.player_list[i]];
		// Remove played cards from hand
		if (player_object.id !== old_czar)
		{
			var index_list = [];
			for (var j = 0; j < player_object.current_game.played_cards.length; j++)
				index_list.push(player_object.current_game.played_cards[j].hand_id);
			// Reverse sort cards so those with the highest index are removed first and do not change the
			// indicies of lower cards
			index_list.sort(function(a, b) {return (b - a);});
			for (var j = 0; j < index_list.length; j++)
				player_object.current_game.hand.splice(index_list[j], 1);
		}
		// Reset played data
		player_object.current_game.played_cards = null;
		// Deal players replacement cards and extras (if the next black card has three blanks)
		var new_cards;
		if (player_object.id === old_czar)
			new_cards = room.deck.deal_white(extra_cards);
		else if (player_object.id === new_czar)
			new_cards = room.deck.deal_white(replacement_cards);
		else
			new_cards = room.deck.deal_white(replacement_cards + extra_cards);
		// Make the bare cards for the socket data object
		data_object.new_cards = [];
		for (var j = 0; j < new_cards.length; j++)
		{
			data_object.new_cards.push({
				id: new_cards[j].id,
				color: new_cards[j].color,
				text: new_cards[j].text,
				deck_name: new_cards[j].deck_name,
				hand_id: player_object.current_game.hand.length + j
			});
		}
		player_object.current_game.hand = player_object.current_game.hand.concat(new_cards);
		// Now notify the player of the turn transition and their new cards
		if (player_object.socket)
			player_object.socket.emit('choose_czar_card', data_object);

		delete data_object.new_cards;
	}

	reset_timer(room_id);

	// Also notify waiting players
	for (var i = 0; i < room.waiting_list.length; i++)
	{
		var player_object = room.waiting_players[room.waiting_list[i]];
		if (player_object.socket)
			player_object.socket.emit('choose_czar_card', data_object);
	}
};

var end_game = function(room_id, winner, win_msg)
{
	var room = get_room_by_id(room_id);
	if (room === undefined)
		return;

	clean_up_game(room_id);

	room.last_winner = room.players[winner];

	var data_object = {
		winner: winner,
		msg: win_msg
	};
	room_io.to(room_id).emit('end_game', data_object);
};

// Cleans up game data when the game is over to get ready for the next game
// Also moves waiting players to active players
// This function resets the timer
var clean_up_game = function(room_id)
{
	var room = get_room_by_id(room_id);
	if (room === undefined)
		return;

	// Reset room data, clearing all memory of the last game
	delete room.current_game;
	for (var i = 0; i < room.player_list.length; i++)
	{
		var player_object = room.players[room.player_list[i]];
		delete player_object.current_game;
	}
	room.started = false;

	// Add the waiting users in as active users
	while (room.waiting_list.length > 0)
	{
		if (room.player_list.length >= room.max_players)
			break;
		// Remove player from waiting list
		var player_id = room.waiting_list.shift();
		var player_object = room.waiting_players[player_id];
		delete room.waiting_players[player_id];
		// Add to players
		room.player_list.push(player_id);
		room.players[player_id] = player_object;
	}

	reset_timer(room_id);
};

module.exports = {
	error                       : room_common.error,
	room_object                 : room_common.room_object,
	check_name                  : room_common.check_room_name,
	validate_name_field         : validate_room_name_field,
	check_password              : room_common.check_password,
	validate_password_field     : validate_password_field,
	check_objective             : room_common.check_objective,
	validate_objective_field    : validate_objective_field,
	check_hand_size             : room_common.check_hand_size,
	validate_hand_size_field    : validate_hand_size_field,
	check_max_players           : room_common.check_max_players,
	validate_max_players_field  : validate_max_players_field,
	check_redraws               : room_common.check_redraws,
	validate_redraws_field      : validate_redraws_field,
	check_decks                 : room_common.check_decks,
	validate_decks_field        : validate_decks_field,
	check_room                  : room_common.check_room,
	sanitize_decks              : sanitize_decks,
	reset_timer                 : reset_timer,
	timeout_expired             : timeout_expired,
	room_ids                    : room_ids,
	create                      : create_room,
	get_by_id                   : get_room_by_id,
	get_user_room               : get_user_room,
	get_player                  : get_player,
	leave                       : leave_room,
	close                       : close_room,
	join                        : join_room,
	lookup                      : lookup_room,
	active_player               : active_player,
	kick_user                   : kick_user,
	start_game                  : start_game,
	start_host_game             : start_host_game,
	all_played                  : all_played,
	start_czar_turn             : start_czar_turn,
	play_card                   : play_card,
	unplay_cards                : unplay_cards,
	choose_czar_card            : choose_czar_card,
	next_turn                   : next_turn,
	end_game                    : end_game,
	clean_up_game               : clean_up_game
};
