"use strict";
var express = require('express');
var path = require('path');
var deck = require(path.normalize(path.join(__dirname, '..', 'db', 'deck')));
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
		res.render('create_game', {form_data: {}, user_decks: user_decks});
	}, function(err)
	{
		next(err);
	});
});

// router.post('/create', ensure_user.authenticated, function(req, res, next)
// {
	
// });

module.exports = router;
