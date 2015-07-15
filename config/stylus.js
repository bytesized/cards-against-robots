"use strict";
// This returns an object containing stylus options to be
// passed to the stylus middleware. Besides compiling the stylesheets from
// /stylus/stylesheets to /public/stylesheets, we also want to define some
// global variables by passing them in during the compile function
// with the define() function
var path = require('path');
var stylus = require('stylus');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));

var compile;
if (config.properties.is_configured)
{
	compile = function(str, path)
	{
		return stylus(str)
			.set('filename', path)
			.set('compress', true)
			.define('card_image_height', config.card_icon.height)
			.define('card_image_width', config.card_icon.width);
	}
} else
{
	// If we do not have a configuration yet, just define _something_
	// so there are no errors. The card_image won't be used until after
	// configuration anyways.
	compile = function(str, path)
	{
		return stylus(str)
			.set('filename', path)
			.set('compress', true)
			.define('card_image_height', '35px')
			.define('card_image_width', '55px');
	}
}

module.exports = {
	src     : path.normalize(path.join(__dirname, '..', 'stylus')),
	dest    : path.normalize(path.join(__dirname, '..', 'public')),
	compile : compile
};