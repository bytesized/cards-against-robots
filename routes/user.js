"use strict";
var express = require('express');
var path = require('path');
var passport = require('passport');
var user = require(path.normalize(path.join(__dirname, '..', 'db', 'user')));
var router = express.Router();
var Promise = require("bluebird");

router.get('/login', function(req, res, next)
{
	if (req.isAuthenticated())
		res.redirect('/');
	else
		res.render('login', {form_data: {}});
});

router.post('/login', 
	passport.authenticate('local',
	{
		failureRedirect : '/user/login',
		failureFlash    : true
	}),
	function(req, res, next)
	{
		// Login successful!
		var redirect_url = '/game';
		if (req.session.redirect_url)
		{
			redirect_url = req.session.redirect_url;
			delete req.session.redirect_url;
		}
		res.redirect(redirect_url);
	}
);

router.get('/register', function(req, res, next)
{
	res.render('register', {form_data: {}, invitation: false});
});

router.post('/register', function(req, res, next)
{
	var new_user = new user.user_object;
	new_user.username = req.body.username;
	new_user.password = req.body.password;
	var form_data = {username: new_user.username};

	user.validate_username_field(req, 'username');
	user.validate_password_field(req, 'password');
	req.checkBody('password_confirm', 'Passwords do not match').equals(new_user.password);

	var errors = req.validationErrors();
	if (errors)
	{
		res.set_validation_errors(errors);
		res.render('register', {form_data: form_data, invitation: false});
	} else
	{
		user.create(new_user).then(function()
		{
			// This is the only time we need promisification of the passport library.
			req.loginAsync = Promise.promisify(req.login);
			return req.loginAsync(new_user);
		}).then(function()
		{
			req.flash('success', 'User Created! You are now logged in');
			res.redirect('/');
		}, function(err)
		{
			// The only error did not handle was the "that username already exists" error.
			// do so now.
			if (err instanceof user.error && err.code === 'DUP_USERNAME')
			{
				res.set_validation_errors([{param:'username', msg: err.message, value: ''}])
				res.render('register', {form_data: form_data});
			} else {
				next(err);
			}
		});
	}
});

router.get('/logout', function(req, res, next)
{
	req.logout();
	res.redirect('/');
});

module.exports = router;
