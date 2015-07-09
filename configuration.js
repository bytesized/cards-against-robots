"use strict";
var fs = require('fs');
var path = require('path');

// The configuration itself. Will be set when reload() is called
var config_object;

// Static properties
var filename = path.join(__dirname, 'configuration.json');

// Sets a configuration option to the specified value
// Ex: set('mysql.host', 'localhost')
var set = function(option, value)
{
	var tokens = option.split('.');
	var attribute = tokens.pop();

	// Resolve the option object specified
	// (Ex: if option == 'mysql.host', option_object = config_object.mysql)
	var option_object = config_object;
	while(tokens.length > 0)
	{
		var token = tokens.shift();
		if (!option_object[token])
			option_object[token] = {};
		option_object = option_object[token];
	}

	option_object[attribute] = value;
};

var save_sync = function()
{
	fs.writeFileSync(filename, JSON.stringify(config_object, null, 4));
}

// Load configuration if it exists
var reload = function()
{
	var is_configured;
	try
	{
		config_object = JSON.parse(fs.readFileSync(filename));
		is_configured = true;
	} catch (error)
	{
		if (error.code === 'ENOENT') // File not found -> No existing configuration
		{
			config_object = {};
			is_configured = false;
		} else
		{
			throw error;
		}
	}
	config_object.properties = {
		filename      : filename,
		is_configured : is_configured
	};

	config_object.methods = {
		set       : set,
		reload    : reload,
		save_sync : save_sync
	};
};
reload();

module.exports = config_object;

