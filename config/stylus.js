"use strict";
// This returns an object containing stylus options to be
// passed to the stylus middleware. Besides compiling the stylesheets from
// /stylus/stylesheets to /public/stylesheets, we also want to define some
// global variables by passing them in during the compile function
// with the define() function
var path = require('path');
var stylus = require('stylus');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));

var compile = function(str, stylus_path)
{
	return stylus(str)
		.set('filename', stylus_path)
		.set('compress', true)
		.define('card_height', new stylus.nodes.Unit(config.card.height, 'px'))
		.define('card_width', new stylus.nodes.Unit(config.card.width, 'px'))
		.define('card_icon_url', '/images/' + encodeURIComponent(config.card_icon.filename))
		.define('card_icon_height', new stylus.nodes.Unit(config.card_icon.height, 'px'))
		.define('card_icon_width', new stylus.nodes.Unit(config.card_icon.width, 'px'));
};

module.exports = {
	src     : path.normalize(path.join(__dirname, '..', 'stylus')),
	dest    : path.normalize(path.join(__dirname, '..', 'public')),
	compile : compile
};