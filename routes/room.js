"use strict";
var express = require('express');
var path = require('path');
var Promise = require('bluebird');
var room = require(path.normalize(path.join(__dirname, '..', 'db', 'room')));
var card = require(path.normalize(path.join(__dirname, '..', 'db', 'card')));
var ensure_user = require(path.normalize(path.join(__dirname, '..', 'common', 'ensure_user')));
var router = express.Router();

/* GET home page. */
router.get('/:id', ensure_user.authenticated, function(req, res, next)
{
	var room_object = room.get_by_id(req.params.id);
	if (!room_object)
	{
		// If the room object could not be found, attempt to lookup the ID given
		// (it may be a case issue: 'roomname' instead of 'RoomName')
		var resolved = room.lookup(req.params.id);
		if (resolved === null)
			return next();
		else
			return res.redirect('/room/' + encodeURIComponent(resolved));
	}

	if (req.user.room !== room_object.id && room_object.password)
	{
		res.render('room_password', {room: room_object});
	} else
	{
		// If the user is not in the room and the room does not have a password,
		// they should join the room now
		if (req.user.room !== room_object.id)
		{
			try
			{
				room.join(req.user, room_object.id);
			} catch (err)
			{
				if (err instanceof room.error)
				{
					req.flash('error', err.message);
					return res.redirect('/game/list');
				} else {
					return next(err);
				}
			}
		}

		// User is now registered as a room member
		if (room.started && room.active_player(req.user.id, room_object.id))
			res.render('game_room', {room: room_object});
		else
			res.render('waiting_room', {room: room_object, card: {white: card.white, black: card.black}});
	}
});

module.exports = router;
