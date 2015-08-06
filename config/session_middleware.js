var path = require('path');
var session = require('express-session');
var secret = require(path.normalize(path.join(__dirname, '..', 'common', 'secret')));

module.exports = session({
	secret: secret.generate(256, true).toString(),
	saveUninitialized: true,
	resave: true
})