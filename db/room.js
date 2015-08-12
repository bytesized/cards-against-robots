"use strict";
// This module provides functionality related to the room each game is allocated
var path = require('path');
var Promise = require('bluebird');
var validator = require('validator');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var deck = require(path.join(__dirname, 'deck'));
var user = require(path.join(__dirname, 'user'));
var card = require(path.join(__dirname, 'card'));
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
		room_object.deck = new smart_deck(cards.white, cards.black);

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
// Does not send a signal to the user who is leaving
var leave_room = function(user_id)
{
	var room_id = user_rooms[user_id];
	if (room_id === undefined)
		return;
	var room = rooms[room_id];

	// The data object that will be sent to the clients to notify that a player has left
	var socket_data_object = {};
	socket_data_object.player = user_id;

	if(room.players[user_id])
	{
		if (room.players[user_id].socket !== undefined)
		{
			room.players[user_id].socket.leave(room_id);
			delete room.players[user_id].socket;
		}
		delete room.players[user_id];
		var list_index = room.player_list.indexOf(user_id);
		room.player_list.splice(list_index, 1);
	} else if (room.waiting_players[user_id])
	{
		if (room.waiting_players[user_id].socket !== undefined)
		{
			room.waiting_players[user_id].socket.leave(room_id);
			delete room.waiting_players[user_id].socket;
		}
		delete room.waiting_players[user_id];
		var list_index = room.waiting_list.indexOf(user_id);
		room.waiting_list.splice(list_index, 1);
	}

	delete user_rooms[user_id];

	if (room.player_list.length === 0 && rooms[room_id].waiting_list.length === 0)
	{
		close_room(room_id);
	} else
	{
		if (room.host === user_id)
		{
			room.host = room.player_list[0];
			socket_data_object.new_host = room.host;
		}

		room_io.to(room_id).emit('player_leave', JSON.stringify(socket_data_object));
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

	room_io.to(room_id).emit('close');
};

// Will throw an error if the room cannot be joined
var join_room = function(user_object, room_id)
{
	if (!rooms[room_id])
		throw new room_common.error('No such room', 'BAD_ROOM');
	var room = get_room_by_id(room_id);
	if (room.player_list.length + room.waiting_list.length >= room.max_players)
		throw new room_common.error('That room is full', 'ROOM_FULL');

	if (user_rooms[user_object.id] !== undefined)
		leave_room(user_object.id);

	if (room.started)
	{
		room.waiting_list.push(user_object.id);
		room.waiting_players[user_object.id] = user_object;
	} else
	{
		room.player_list.push(user_object.id);
		room.players[user_object.id] = user_object;
	}
	user_rooms[user_object.id] = room_id;

	var safe_user_object = {
		id       : user_object.id,
		username : user_object.username,
	};
	room_io.to(room_id).emit('player_join', JSON.stringify(safe_user_object));
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
	var msg_object = {user_id: user.id, username: user.username, text: msg};

	room.chat.push(msg_object);
	room_io.to(room_id).emit('chat', JSON.stringify(msg_object));
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
	kick_user                   : kick_user
};
