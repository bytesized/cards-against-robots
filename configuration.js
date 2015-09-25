"use strict";
var fs = require('fs');
var path = require('path');
var object_attribute = require(path.normalize(path.join(__dirname, 'common', 'object_attribute')));
var secret = require(path.normalize(path.join(__dirname, 'common', 'secret')));

// The configuration itself. Will be set when reload() is called
var config_object;

// Static properties
var filename = path.join(__dirname, 'configuration.json');

// Sets a configuration option to the specified value
// Ex: set('mysql.host', 'localhost')
var set = function(option, value)
{
	object_attribute.set(config_object, option, value);
};

var save_sync = function()
{
	fs.writeFileSync(filename, JSON.stringify(config_object, function(key, val)
	{
		if (key !== 'methods' && key !== 'properties')
			return val;
	}, 4));
};

// This function is run if there is no configuration file. It sets two possible types
// of configuration settings: ones that are not exposed to the user in the configuration
// jade page, and default values for ones that are (to be overridden by user input)
var set_default_config = function()
{
	config_object = {};
	// Set card icon defaults so that stylus will properly generate stylesheets during config
	config_object.card_icon = {};
	config_object.card_icon.filename = 'dummy.png';
	config_object.card_icon.height = 35;
	config_object.card_icon.width = 35;
	// Card Size - Not exposed to the user. Changing its size may result in pages looking wrong
	config_object.card = {};
	config_object.card.width = 200;
	config_object.card.height = 300;
	config_object.card.margin = 5;
	config_object.card.padding = 5;
};

// This function allows for new versions of the program to operate with old versions of the config
// by generating acceptable new values for missing (but required) values
var check_required = function()
{
	var changed = false;

	if (!config_object.session_secret)
	{
		changed = true;
		config_object.session_secret = secret.generate(256, true).toString();
	}

	if (changed && config_object.properties.is_configured)
		save_sync();
};

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
			set_default_config();
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

	check_required();
};
reload();

module.exports = config_object;

