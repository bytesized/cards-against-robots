"use strict";
// Allows a more decentralized usage of socket.io
// `init()` MUST be called before using
var path = require('path');
var session_middleware = require(path.normalize(path.join(__dirname, '..', 'config', 'session_middleware')));
var user = require(path.normalize(path.join(__dirname, '..', 'db', 'user')));

var io;

var connect_authenticate_middleware = function(io_namespace)
{
	io_namespace.use(function(socket, next)
	{
		session_middleware(socket.request, {}, next);
	}).use(function(socket, next)
	{
		// Reject anyone without a passport session
		if (!socket.request.session.passport)
			return next(new Error('Authentication Error - Session not found'));
		if (socket.request.session.passport.user === undefined)
			return next(new Error('Authentication Error - Session not found'));;

		var user_id = socket.request.session.passport.user;
		user.get_by_id(user_id).then(function(user_info)
		{
			if (user_info === null)
			{
				next(new Error('Authentication Error'));
			} else
			{
				socket.request.user = user_info;
				next();
			}
		}, function(err)
		{
			next(new Error('Authentication Error'));
		});
	});
};

var init = function(server)
{
	io = require('socket.io')(server);
	connect_authenticate_middleware(io);
};

var get_io = function()
{
	return io;
};

module.exports = {
	init                            : init,
	io                              : get_io,
	connect_authenticate_middleware : connect_authenticate_middleware
};
