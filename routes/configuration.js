var express = require('express');
var path = require('path');
var database = require(path.normalize(path.join(__dirname, '..', 'database')));
var fs = require('fs');
var Promise = require('bluebird');
var configuration = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var router = express.Router();
var states = {
	unconfigured: 'unconfigured',
	configuring:  'configuring',
	configured:   'configured'
};
var state = states.unconfigured;
var form_data = {};

router.get('/', function(req, res, next)
{
	res.render('configure', {state: state, form_data: form_data});
});

// Gets the data from a submitted form specifically for sending
// back to the user to fill into the form we send back
// Omits password fields as these will not be sent back
function get_form_data(request)
{
	var data = {};

	data.site_name              = request.body.site_name;
	data.card_icon_filename     = request.body.card_icon;
	data.card_icon_height       = request.body.card_icon_height;
	data.card_icon_width        = request.body.card_icon_width;
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

// Gets the configuration data from a submitted request.
// Data is sanitized and returned as a config object
// Super user data is omitted because that is not actually part of the config data
function get_config(request)
{
	var config = {};

	config.site_name              = request.sanitize('site_name').trim();
	config.card_icon_filename     = request.sanitize('card_icon').trim();
	config.card_icon_height       = request.sanitize('card_icon_height').toInt(10);
	config.card_icon_width        = request.sanitize('card_icon_width').toInt(10);
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

/* POST configure request */
router.post('/', function(req, res, next)
{
	if (state != states.unconfigured)
	{
		res.render('configure', {state: state, form_data: form_data, errors: errors});
		return;
	}
	// If state IS unconfigured, configure now
	state = states.configuring;
	// Input Validation
	req.checkBody('site_name', 'Site Name is required').notEmpty();
	req.checkBody('site_name', 'I JUST told you. That name is a registered trademark').is_not('Cards Against Humanity', true);
	req.checkBody('card_icon', 'Card Icon Filename is required').notEmpty();
	req.checkBody('card_icon_height', 'Card Icon Height must be a positive integer').custom_int({positive: true});
	req.checkBody('card_icon_width', 'Card Icon Width must be a positive integer').custom_int({positive: true});
	// MYSQL host, database, username and password will be validated by connecting to the database. No need to do it here
	req.checkBody('mysql_connection_limit', 'MYSQL connection limit must be a positive integer').custom_int({positive: true});
	req.checkBody('mysql_port', 'MYSQL port must be a positive integer').custom_int({positive: true});
	req.checkBody('token_length', 'Token Length must be a positive even integer').custom_int({positive: true, even: true});
	req.checkBody('username_length', 'Username Length must be a positive integer').custom_int({positive: true});
	req.checkBody('deck_name_length', 'Deck Name Length must be a positive integer').custom_int({positive: true});
	req.checkBody('card_text_length', 'Card Text Length must be a positive integer').custom_int({positive: true});
	// FIXME: Validate username and password

	var errors = req.validationErrors();

	// Get data to return to repopulate the form when we send the page back
	form_data = get_form_data(req);

	if (errors)
	{
		state = states.unconfigured;
		res.render('configure', {state: state, form_data: form_data, errors: errors});
		return;
	}

	var config = get_config(req);

	// Try to read the card image to make sure that it is there
	var card_icon_path = path.normalize(path.join(__dirname, '..', 'public', 'images', config.card_icon_filename));
	try
	{
		fs.readFileSync(card_icon_path);
	} catch (err)
	{
			var errors = [{param: '', msg: 'When reading card icon file, got "' + err + '"', value: ''}];

			state = states.unconfigured;
			res.render('configure', {state: state, form_data: form_data, errors: errors});
			return;
	}

	// Initialize the tables in the database. This doubles as validating the MYSQL config data
	// (If the connection fails, the MYSQL configuration is wrong)
	database.init(config).then(function()
	{
		// No MYSQL errors! That was the last config check. Write out the config file
		// and render the page
		var errors = null;
		try
		{
			fs.writeFileSync(configuration.filename, JSON.stringify(config, null, 4));
			state = states.configured;
		} catch (err) 
		{
			state = states.unconfigured;
			var errors = [{param: '', msg: 'When writing configuration file, got "' + err + '"', value: ''}];
		}
		res.render('configure', {state: state, form_data: form_data, errors: errors});
	}, function(err)
	{
		// On MYSQL error
		var errors = [{param: '', msg: 'When creating MYSQL tables, got "' + err + '"', value: ''}];

		state = states.unconfigured;
		res.render('configure', {state: state, form_data: form_data, errors: errors});
	});
});

module.exports = router;

