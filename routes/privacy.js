"use strict";
var express = require('express');
var path = require('path');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var router = express.Router();

/* GET contact page */
router.get('/', function(req, res, next)
{
	var user = get_user(req);
	res.render('privacy', {user: user});
});

function get_user(req)
{
	if (req.isAuthenticated())
		return req.user;
	else
		return null;
};

module.exports = router;
