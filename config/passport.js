"use strict";
// Just requiring this module will configure passport
var path = require('path');
var passport = require('passport');
var local_strategy = require('passport-local').Strategy;
var user = require(path.normalize(path.join(__dirname, '..', 'user')));
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));

passport.serializeUser(function(user, done)
{
	done(null, user.id);
});

passport.deserializeUser(function(id, done)
{
	user.get_by_id(id).then(function(user_info)
	{
		done(null, user_info);
	}, function(err)
	{
		done(err);
	});
});

passport.use(
	new local_strategy(function(username, password, done)
	{
		user.get_by_username(username).then(function(user_info)
		{
			if (!user_info)
			{
				return done(null, false, { message: 'That user does not exist' });
			} else
			{
				return user.verify_password(user_info.password, password).then(function(password_matches)
				{
					if (password_matches)
						return done(null, user_info);
					else
						return done(null, false, { message: 'Username or Password is incorrect' });
				});
			}
		}).catch(function(err)
		{
			done(err);
		});
	})
);