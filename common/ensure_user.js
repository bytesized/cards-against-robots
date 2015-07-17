"use strict";
// This module provides middleware functions for ensuring different levels of user authentication
// The functions will only call next if the desired level of authentication is met.
// Calling one of these functions also sets res.locals.user (to the value of req.user)

var ensure_authentication = function(req, res, next)
{
	if (req.isAuthenticated())
	{
		res.locals.user = req.user;
		return next();
	}

	// Allows the user to be redirected back to this page after authentication
	req.session.redirect_url = req.url;
	res.redirect('/user/login');
}

module.exports = {
	authenticated: ensure_authentication
};