"use strict";
var express = require('express');
var path = require('path');
var validator = require('validator');
var user = require(path.normalize(path.join(__dirname, '..', '..', 'db', 'user')));
var deck = require(path.normalize(path.join(__dirname, '..', '..', 'db', 'deck')));
var card = require(path.normalize(path.join(__dirname, '..', '..', 'db', 'card')));
var ensure_user = require(path.normalize(path.join(__dirname, '..', '..', 'common', 'ensure_user'))).ajax;
var ensure_data = require(path.normalize(path.join(__dirname, '..', '..', 'common', 'ensure_ajax_data')));
var router = express.Router();

router.post('/create', ensure_user.authenticated, ensure_data.exists('name'), function(req, res, next)
{
	var new_deck = new deck.deck_object;
	new_deck.name = req.body.name;
	new_deck.creator = req.user.id;

	deck.create(new_deck).then(function(created_deck)
	{
		res.json({ error: null, deck: created_deck });
	}).catch(function(err)
	{
		if (err instanceof deck.error)
			res.json({ error: err.message });
		else
			next(err);
	});
});

router.post('/load', ensure_user.authenticated, ensure_data.exists('id'), function(req, res, next)
{
	var deck_id = req.body.id;

	deck.get_cards(deck_id).then(function(cards)
	{
		res.json({ error: null, cards: cards });
	}).catch(function(err)
	{
		if (err instanceof deck.error)
			res.json({ error: err.message });
		else
			next(err);
	});
});

router.post('/create_add_card', ensure_user.authenticated, ensure_data.exists('text', 'color', 'quantity', 'deck'), function(req, res, next)
{
	if (!validator.isBoolean(req.body.color))
		return res.json({ error: 'Internal Error: Bad input datatype' });

	var new_card = new card.card_object;
	new_card.text = req.body.text;
	new_card.color = validator.toBoolean(req.body.color);
	new_card.creator = req.user.id;
	var target_deck_id = req.body.deck;
	var quantity = req.body.quantity;

	deck.ensure_user_ownership(target_deck_id, req.user.id).then(function()
	{
		return card.create(new_card);
	}).then(function(inserted_card) {
		new_card = inserted_card;
		return deck.add_card(inserted_card.id, target_deck_id, quantity);
	}).then(function()
	{
		res.json({ error: null, card: new_card});
	}).catch(function(err)
	{
		if (err instanceof deck.error || err instanceof card.error)
			res.json({ error: err.message });
		else
			next(err);
	});
});

module.exports = router;
