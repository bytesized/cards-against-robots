"use strict";
var express = require('express');
var path = require('path');
var user = require(path.normalize(path.join(__dirname, '..', '..', 'db', 'user')));
var deck = require(path.normalize(path.join(__dirname, '..', '..', 'db', 'deck')));
var ensure_user = require(path.normalize(path.join(__dirname, '..', '..', 'common', 'ensure_user'))).ajax;
var router = express.Router();

router.post('/create', ensure_user.authenticated, function(req, res, next)
{
	if (!req.body.name)
	{
		res.json({ error: 'Deck name not found' });
	} else
	{
		var new_deck = new deck.deck_object;
		new_deck.name = req.body.name;
		new_deck.creator = req.user.id;

		deck.create(new_deck).then(function(created_deck)
		{
			res.json({ error: null, deck: created_deck });
		}).catch(function(err)
		{
			if (err.name === 'DeckError')
				res.json({ error: err.message });
			else
				next(err);
		});
	}
});

module.exports = router;
