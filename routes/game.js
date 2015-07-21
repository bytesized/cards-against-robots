"use strict";
var express = require('express');
var path = require('path');
var ensure_user = require(path.normalize(path.join(__dirname, '..', 'common', 'ensure_user')));
var router = express.Router();

/* GET home page. */
router.get('/', ensure_user.authenticated, function(req, res, next)
{
	res.render('game', {});
});

router.get('/create', ensure_user.authenticated, function(req, res, next)
{
	res.render('create_game', {form_data: {}});
});

module.exports = router;