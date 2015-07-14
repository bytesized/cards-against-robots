"use strict";
var express = require('express');
var path = require('path');
var database = require(path.normalize(path.join(__dirname, '..', 'database')));
var fs = require('fs');
var Promise = require('bluebird');
var configuration = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var user = require(path.normalize(path.join(__dirname, '..', 'user')));
var router = express.Router();

var states = {
	unconfigured: 'unconfigured',
	configuring:  'configuring',
	configured:   'configured'
};
var state = states.unconfigured;
// Form data is constant across all users (if there is more than one)
var form_data = {}; 

router.get('/', function(req, res, next)
{
	res.render('configure', {state: state, form_data: form_data});
});

/* POST configure request */
router.post('/', function(req, res, next)
{
	if (state != states.unconfigured)
	{
		res.render('configure', {state: state, form_data: form_data});
		return;
	}
	// If state IS unconfigured, configure now
	state = states.configuring;
	
	// Get data to return to repopulate the form when we send the page back
	form_data = get_form_data(req);

	var errors = validate_input(req);
	if (errors)
	{
		configuration_error(res, errors);
		return;
	}

	// Configuration looks good. Set this as the current configuration so we can try to use it
	var config = get_config(req);
	set_config(config);

	// Try to read the card image to make sure that it is there
	var card_icon_path = path.normalize(path.join(__dirname, '..', 'public', 'images', config.card_icon.filename));
	var error = check_file(card_icon_path)
	if (error)
	{
		var errors = [{
			param : ['card_icon'],
			msg   : 'Error opening card icon: ' + error.message,
			value : ''}];

		configuration_error(res, errors);
		return;
	}

	// Initialize the tables in the database. This doubles as validating the MYSQL config data
	// (If the connection fails, the MYSQL configuration is wrong)
	database.init().then(function()
	{
		// Now that database and tables exist, create the primary super user.
		return user.create_primary_superuser(req.body.super_user_name, req.body.super_user_password);
	}).then(function()
	{
		// No MYSQL errors!
		on_configuration_complete(res);
	}).catch(user.error, function(err)
	{
		// Got an error sent from the user module
		if (err.code == 'BAD_REQUEST' && err.message == 'Primary Super User already exists')
		{
			// If the only error is that the primary super user already exists, the configuration is complete,
			// just warn the user that no new user was created
			on_configuration_complete(res, ["Primary Superuser already exists and so was not created"]);
		} else {
			var errors = interpret_user_error(err);

			configuration_error(res, errors);
		}
	}).catch(function(err)
	{
		var errors = interpret_mysql_error(err);
		configuration_error(res, errors);
	});
});

// Gets the data from a submitted form specifically for sending
// back to the user to fill into the form we send back
// Omits password fields as these will not be sent back
function get_form_data(request)
{
	var data = {};

	data.site_name              = request.body.site_name;
	data.card_icon              = {};
	data.card_icon.filename     = request.body.card_icon;
	data.card_icon.height       = request.body.card_icon.height;
	data.card_icon.width        = request.body.card_icon.width;
	data.mysql                  = {};
	data.mysql.host             = request.body.mysql_host;
	data.mysql.port             = request.body.mysql_port;
	data.mysql.database         = request.body.mysql_database;
	data.mysql.username         = request.body.mysql_username;
	// Omit MYSQL password
	data.mysql.connection_limit = request.body.mysql_connection_limit;
	if (request.body.invitations_required)
		data.invitations_required = true;
	else
		data.invitations_required = false;
	data.token_length           = request.body.token_length;
	data.username_length        = request.body.username_length;
	data.deck_name_length       = request.body.deck_name_length;
	data.card_text_length       = request.body.card_text_length;
	data.super_user_name        = request.body.super_user_name;
	// Omit super user password

	return data;
}

function validate_input(req)
{
	req.checkBody('site_name', 'Site Name is required').notEmpty();
	req.checkBody('site_name', 'I JUST told you. That name is a registered trademark').is_not('Cards Against Humanity', true);
	req.checkBody('card_icon', 'Card Icon Filename is required').notEmpty();
	req.checkBody('card_icon_height', 'Card Icon Height must be a positive integer').custom_int({positive: true});
	req.checkBody('card_icon_width', 'Card Icon Width must be a positive integer').custom_int({positive: true});
	// MYSQL host, username and password will be validated by connecting to the database. No need to do it here
	req.checkBody('mysql_database', 'MYSQL database is required').notEmpty();
	req.checkBody('mysql_connection_limit', 'MYSQL connection limit must be a positive integer').custom_int({positive: true});
	req.checkBody('mysql_port', 'MYSQL port must be a positive integer').custom_int({positive: true});
	req.checkBody('token_length', 'Token Length must be a positive even integer').custom_int({positive: true, even: true});
	req.checkBody('username_length', 'Username Length must be a positive integer').custom_int({positive: true});
	req.checkBody('deck_name_length', 'Deck Name Length must be a positive integer').custom_int({positive: true});
	req.checkBody('card_text_length', 'Card Text Length must be a positive integer').custom_int({positive: true});
	req.checkBody('super_user_password_confirm', 'Super User passwords do not match').equals(req.body.super_user_password);
	// Super User username and password will be validated by trying to create the user

	return req.validationErrors();
}

// Gets the configuration data from a submitted request.
// Data is sanitized and returned as a config object
// Super user data is omitted because that is not actually part of the config data
function get_config(request)
{
	var config = {};

	config.site_name              = request.sanitize('site_name').trim();
	config.card_icon              = {};
	config.card_icon.filename     = request.sanitize('card_icon').trim();
	config.card_icon.height       = request.sanitize('card_icon_height').toInt(10);
	config.card_icon.width        = request.sanitize('card_icon_width').toInt(10);
	config.mysql                  = {};
	config.mysql.host             = request.sanitize('mysql_host').trim();
	config.mysql.port             = request.sanitize('mysql_port').toInt(10);
	config.mysql.database         = request.sanitize('mysql_database').trim();
	config.mysql.username         = request.sanitize('mysql_username').trim();
	config.mysql.password         = request.body.mysql_password;
	config.mysql.connection_limit = request.sanitize('mysql_connection_limit').toInt(10);
	if (request.body.invitations_required)
		config.invitations_required = true;
	else
		config.invitations_required = false;
	config.token_length           = request.sanitize('token_length').toInt(10);
	config.username_length        = request.sanitize('username_length').toInt(10);
	config.deck_name_length       = request.sanitize('deck_name_length').toInt(10);
	config.card_text_length       = request.sanitize('card_text_length').toInt(10);

	return config;
}

// Sets each config value
function set_config(config)
{
	configuration.methods.set('site_name', config.site_name);
	configuration.methods.set('card_icon.filename', config.card_icon.filename);
	configuration.methods.set('card_icon.height', config.card_icon.height);
	configuration.methods.set('card_icon.width', config.card_icon.width);
	configuration.methods.set('mysql.host', config.mysql.host);
	configuration.methods.set('mysql.port', config.mysql.port);
	configuration.methods.set('mysql.database', config.mysql.database);
	configuration.methods.set('mysql.username', config.mysql.username);
	configuration.methods.set('mysql.password', config.mysql.password);
	configuration.methods.set('mysql.connection_limit', config.mysql.connection_limit);
	configuration.methods.set('invitations_required', config.invitations_required);
	configuration.methods.set('token_length', config.token_length);
	configuration.methods.set('username_length', config.username_length);
	configuration.methods.set('deck_name_length', config.deck_name_length);
	configuration.methods.set('card_text_length', config.card_text_length);
}

// Makes sure file exists and is readable (by reading it). Returns error
function check_file(filename)
{
	try
	{
		fs.readFileSync(filename);
		return false;
	} catch (err)
	{
			return err;
	}
}

function configuration_error(res, errors)
{
		state = states.unconfigured;
		res.render('configure', {state: state, form_data: form_data, errors: errors});
		return;
}

function interpret_mysql_error(err)
{
	var errors;
	if (err.code == 'ER_ACCESS_DENIED_ERROR' || err.code == 'ER_DBACCESS_DENIED_ERROR')
	{
		errors = [{
			param : ['mysql_username', 'mysql_password'],
			msg   : 'MYSQL Authentication Unsuccessful (Access Denied)',
			value : ''}];
	} else if (err.code == 'ENOTFOUND')
	{
		errors = [{
			param : ['mysql_host', 'mysql_port'],
			msg   : 'MYSQL host not found',
			value : ''}];
	} else if (err.code == 'ECONNREFUSED')
	{
		errors = [{
			param : ['mysql_host', 'mysql_port'],
			msg   : 'MYSQL connection refused',
			value : ''}];
	} else
	{
		errors = [{
			param : ['mysql_host', 'mysql_port', 'mysql_username', 'mysql_password'],
			msg   : 'MYSQL Error: ' + err.message,
			value : ''}];
	}
	return errors;
}

function interpret_user_error(err)
{
	var errors = [{param: ['super_user_name', 'super_user_password'], msg: err.message, value: ''}];
	if (err.code == 'BAD_USERNAME')
		errors[0].param = ['super_user_name'];
	else if (err.code == 'BAD_PASSWORD')
		errors[0].param = ['super_user_password'];
	return errors;
}

function on_configuration_complete(res, messages)
{
		var errors = null;
		try
		{
			configuration.methods.save_sync();
			state = states.configured;
		} catch (err) 
		{
			state = states.unconfigured;
			var errors = [{
				param : [],
				msg   : 'Error writing configuration file: ' + err.message,
				value : ''
			}];
		}
		res.render('configure', {state: state, form_data: form_data, errors: errors, messages: messages});
}

module.exports = router;

