"use strict";
var express = require('express');
var path = require('path');
var Promise = require('bluebird');
var deck = require(path.normalize(path.join(__dirname, '..', 'db', 'deck')));
var room = require(path.normalize(path.join(__dirname, '..', 'db', 'room')));
var ensure_user = require(path.normalize(path.join(__dirname, '..', 'common', 'ensure_user')));
var router = express.Router();

/* GET home page. */
router.get('/', ensure_user.authenticated, function(req, res, next)
{
	res.render('game', {});
});

router.get('/create', ensure_user.authenticated, function(req, res, next)
{
	deck.get_all_by_user_id(req.user.id).then(function(user_decks)
	{
		res.render('create_game', {form_data: {}, user_decks: user_decks, auto_load_decks: []});
	}, function(err)
	{
		next(err);
	});
});

router.post('/create', ensure_user.authenticated, function(req, res, next)
{
	room.validate_name_field(req, 'name');
	room.validate_password_field(req, 'password');
	room.validate_objective_field(req, 'objective');
	room.validate_hand_size_field(req, 'hand_size');
	room.validate_max_players_field(req, 'max_players');
	room.validate_redraws_field(req, 'redraws');
	room.validate_decks_field(req, 'decks');

	var errors = req.validationErrors();

	var new_room = new room.room_object();
	if (!errors)
	{
		// Set room attributes from user input
		new_room.name = req.sanitize('name').trim();
		if (req.body.public)
			new_room.publicly_listed = true;
		else
			new_room.publicly_listed = false;
		if (req.body.password === '')
			new_room.password = null;
		else
			new_room.password = req.body.password;
		new_room.objective = req.sanitize('objective').toInt(10);
		new_room.hand_size = req.sanitize('hand_size').toInt(10);
		new_room.max_players = req.sanitize('max_players').toInt(10);
		new_room.redraws = req.sanitize('redraws').toInt(10);
		new_room.host = req.user.id;
	}
	// Attempt to sanitize decks even on error so we can load those decks and
	// send them back when rendering the page
	try
	{
		new_room.decks = room.sanitize_decks(JSON.parse(req.body.decks, true));
	} catch (err)
	{
		new_room.decks = [];
		throw err;
		var new_error = { param: [], msg: 'Unable to sanitize decks', value: ''};
		if (errors)
			errors.push(new_error);
		else
			errors = [new_error];
	}

	if (!errors)
	{
		try
		{
			room.check_room(new_room);
		} catch (err)
		{
			errors = [{ param: [], msg: err.message, value: ''}];
		}
	}

	if (errors)
	{
		res.set_validation_errors(errors);
		send_create_game_failure(req, res, new_room.decks);
	} else
	{
		// User input is valid! Make the room
		room.create(new_room).then(function(created_room)
		{
			res.redirect('/room/' + encodeURIComponent(created_room.id));
		}, function(err)
		{
			// The only input validation we did not do is to check to make sure the
			// selected decks have sufficient cards of each color. If that error
			// occurs, propogate it back to the user.
			if (err instanceof room.error && err.code === 'INSUFFICIENT_CARDS')
			{
				res.set_validation_errors([{ param: [], msg: err.message, value: ''}]);
				send_create_game_failure(req, res, new_room.decks);
			} else {
				next(err);
			}
		});
	}
});

function send_create_game_failure(req, res, auto_load_decks)
{
	var promises = [];
	promises.push(deck.get_all_by_user_id(req.user.id));
	for (var i = 0; i < auto_load_decks.length; i++)
	{
		promises.push(deck.get_by_id(auto_load_decks[i].id));
	};
	Promise.all(promises).then(function(results)
	{
		// The first result is the user decks
		var user_decks = results.shift();
		// Now `results` is an array of decks that were selected by the user,
		// return these as the auto load decks
		res.render('create_game', {form_data: req.body, user_decks: user_decks, auto_load_decks: results});
	}, function(err)
	{
		next(err);
	});
}

router.get('/leave_room', ensure_user.authenticated, function(req, res, next)
{
	room.leave(req.user.id);
	res.redirect('/game/');
});

router.get('/kicked', ensure_user.authenticated, function(req, res, next)
{
	req.flash('error', 'You have been kicked from the game');
	res.redirect('/game/');
});

router.get('/list', ensure_user.authenticated, function(req, res, next)
{
	res.render('game_list', {room: room});
});

module.exports = router;
