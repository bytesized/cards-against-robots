"use strict";
// Configures the app passed in to use the routes necessary for standard functionality
// Also handles requests that match nothing by sending 404
var path = require('path');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));

module.exports = function(app)
{
	app.use('/',          require(path.join(__dirname, '..', 'routes', 'index')));
	app.use('/user',      require(path.join(__dirname, '..', 'routes', 'user')));
	app.use('/ajax/user', require(path.join(__dirname, '..', 'routes', 'ajax', 'user')));
	app.use('/game',      require(path.join(__dirname, '..', 'routes', 'game')));
	app.use('/deck',      require(path.join(__dirname, '..', 'routes', 'deck')));
	app.use('/ajax/deck', require(path.join(__dirname, '..', 'routes', 'ajax', 'deck')));
	app.use('/room',      require(path.join(__dirname, '..', 'routes', 'room')));
	app.use('/contact',   require(path.join(__dirname, '..', 'routes', 'contact')));
	app.use('/about',     require(path.join(__dirname, '..', 'routes', 'about')));
	app.use('/terms',     require(path.join(__dirname, '..', 'routes', 'terms')));
	app.use('/privacy',   require(path.join(__dirname, '..', 'routes', 'privacy')));

	// catch 404 and forward to error handler
	app.use(function(req, res, next)
	{
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});
}