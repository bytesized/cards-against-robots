"use strict";
var express = require('express');
var path = require('path');
var user = require(path.normalize(path.join(__dirname, '..', '..', 'db', 'user')));
var router = express.Router();

router.post('/exists', function(req, res, next)
{
	if (!req.body.username)
	{
		res.json({ exists: false });
	} else {
		user.get_by_username(req.body.username).then(function(user_object)
		{
			if (user_object === null)
				res.json({ exists: false });
			else
				res.json({ exists: true });
		}, function(err)
		{
			next(err);
		});
	}
});

module.exports = router;
