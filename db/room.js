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
		{
			console.info(dirty_decks[i]);
			console.log(typeof dirty_decks[i].id);
			console.info(dirty_decks[i]);
			console.log(typeof dirty_decks[i].id);
			console.info(dirty_decks[i]);
			console.log(typeof dirty_decks[i].id);
			throw new room_common.error('ID could not be sanitized', 'BAD_DECK_ATTR');
		}
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
		room_object.players = [user_object];

		room_object.id = room_name.get();
		if (rooms[room_object.id])
			throw new room_common.error('Room ID generated is already in use', 'INTERNAL_ERROR');

		// Room is ready, just insert it
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

// Returns the index of the players array that holds the player specified
// Returns null if they player_id was not found in the array
var get_active_player_index = function(player_id, room_id)
{
	for (var i = 0; i < rooms[room_id].players.length; i++)
	{
		if (rooms[room_id].players[i].id === player_id)
			return i;
	}
	return null;
};

// Returns the index of the waiting_players array that holds the player specified
// Returns null if they player_id was not found in the array
var get_waiting_player_index = function(player_id, room_id)
{
	for (var i = 0; i < rooms[room_id].waiting_players.length; i++)
	{
		if (rooms[room_id].waiting_players[i].id === player_id)
			return i;
	}
	return null;
};

// Returns the player object. If `active_only` is true, the waiting players are not
// searched. Returns null if the player is not found
var get_player = function(player_id, room_id, active_only)
{
	var index = get_active_player_index(player_id, room_id);
	if (index !== null)
		return rooms[room_id].players[index];

	if (active_only)
		return null;

	index = get_waiting_player_index(player_id, room_id);
	if (index !== null)
		return rooms[room_id].waiting_players[index];

	return null;
};

// Causes the user specified to leave the room
var leave_room = function(user_id)
{
	var room_id = user_rooms[user_id];

	var player_index = get_active_player_index(user_id, room_id);
	if (player_index !== null)
	{
		rooms[room_id].players[player_index].socket.leave(room_id);
		delete rooms[room_id].players[player_index].socket;
		rooms[room_id].players.splice(player_index, 1);
	} else
	{
		player_index = get_waiting_player_index(user_id, room_id);
		if (player_index !== null)
		{
			rooms[room_id].waiting_players[player_index].socket.leave(room_id);
			delete rooms[room_id].waiting_players[player_index].socket;
			rooms[room_id].waiting_players.splice(player_index, 1);
		}
	}

	delete user_rooms[user_id];
};

// Will throw an error if the room cannot be joined
var join_room = function(user_object, room_id)
{
	if (rooms[room_id].players.length + rooms[room_id].waiting_players.length >= rooms[room_id].max_players)
		throw new room_common.error('That room is full', 'ROOM_FULL');

	if (user_rooms[user_object.id] !== undefined)
		leave_room(user_object.id);

	if (rooms[room_id].started)
		rooms[room_id].waiting_players.push(user_object);
	else
		rooms[room_id].players.push(user_object);
	user_rooms[user_object.id] = room_id;
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
	if (get_active_player_index(user_id, room_id) === null)
		return false;
	else
		return true;
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
	room_io.to(room_id).emit('room.chat', JSON.stringify(msg_object));
};
// Connect socket.io to this function
room_io.on('connection', function(socket)
{
	socket.on('room.chat', function(msg)
	{
		handle_chat_msg(socket.request.user, msg);
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
	create                      : create_room,
	get_by_id                   : get_room_by_id,
	get_user_room               : get_user_room,
	leave                       : leave_room,
	join                        : join_room,
	lookup                      : lookup_room,
	active_player               : active_player
};
