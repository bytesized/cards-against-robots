"use strict";
var express = require('express');
var path = require('path');
var database = require(path.normalize(path.join(__dirname, '..', 'db', 'database')));
var fs = require('fs');
var Promise = require('bluebird');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var router = express.Router();
var configuration = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var user = require(path.normalize(path.join(__dirname, '..', 'db', 'user')));
var object_attribute = require(path.normalize(path.join(__dirname, '..', 'common', 'object_attribute')));
var card = require(path.normalize(path.join(__dirname, '..', 'db', 'card')));
var deck = require(path.normalize(path.join(__dirname, '..', 'db', 'deck')));

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

// Configuration fields to be set by website configuration
// Format:
//   name           - The key to insert the value into the config and form_data objects as (REQUIRED)
//   form_name      - The name of the form input to get the data from (REQUIRED)
//   omit_form_data - Boolean. If true, this field will not be passed to the jade page in form_data
//   omit_config    - Boolean. If true, this field will not go into the configuration
//   validate       - A function that should perform validation. The request and `form_name`,
//                    respectively, will be passed to it
//   sanitize       - A function that should return the sanitized variable
//                    (REQUIRED unless omit_config is `true`)
//                    The request and `form_name`, respectively, will be passed to it
//   is_checkbox    - Boolean, If true, this field's input will be parsed as a checkbox rather than text
var config_fields =
[
	{
		name: 'site_name',
		form_name: 'site_name',
		validate: function(req, name)
		{
			req.checkBody(name, 'Site Name is required').notEmpty();
			req.checkBody(name, 'I JUST told you. That name is a registered trademark').is_not('Cards Against Humanity', true);
		},
		sanitize: function(req, name) { return req.sanitize(name).trim(); }
	},
	{
		name: 'card_icon.filename',
		form_name: 'card_icon',
		validate: function(req, name)
			{ req.checkBody(name, 'Card Icon Filename is required').notEmpty(); },
		sanitize: function(req, name) { return req.sanitize(name).trim(); }
	},
	{
		name: 'card_icon.height',
		form_name: 'card_icon_height',
		validate: function(req, name)
			{ req.checkBody(name, 'Card Icon Height must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'card_icon.width',
		form_name: 'card_icon_width',
		validate: function(req, name)
			{ req.checkBody(name, 'Card Icon Width must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'mysql.host',
		form_name: 'mysql_host',
		sanitize: function(req, name)
			{ return req.sanitize(name).trim(); }
	},
	{
		name: 'mysql.port',
		form_name: 'mysql_port',
		validate: function(req, name)
			{ req.checkBody(name, 'MYSQL port must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'mysql.database',
		form_name: 'mysql_database',
		validate: function(req, name)
			{ req.checkBody(name, 'MYSQL database is required').notEmpty(); },
		sanitize: function(req, name) { return req.sanitize(name).trim(); }
	},
	{
		name: 'mysql.username',
		form_name: 'mysql_username',
		sanitize: function(req, name) { return req.sanitize(name).trim(); }
	},
	{
		name: 'mysql.password',
		form_name: 'mysql_password',
		sanitize: function(req, name) { return req.body[name] },
		omit_form_data: true
	},
	{
		name: 'mysql.connection_limit',
		form_name: 'mysql_connection_limit',
		validate: function(req, name)
			{ req.checkBody(name, 'MYSQL connection limit must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'invitations_required',
		form_name: 'invitations_required',
		sanitize: function(req, name)
		{
			if (req.body[name])
				return true;
			else
				return false;
		},
		is_checkbox: true
	},
	{
		name: 'field_sizes.token',
		form_name: 'token_length',
		validate: function(req, name)
			{ req.checkBody(name, 'Token Length must be a positive even integer').custom_int({positive: true, even: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'field_sizes.username',
		form_name: 'username_length',
		validate: function(req, name)
			{ req.checkBody(name, 'Username Length must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'field_sizes.deck_name',
		form_name: 'deck_name_length',
		validate: function(req, name)
			{ req.checkBody(name, 'Deck Name Length must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'field_sizes.card_text',
		form_name: 'card_text_length',
		validate: function(req, name)
			{ req.checkBody(name, 'Card Text Length must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'field_sizes.room_name',
		form_name: 'room_name_length',
		validate: function(req, name)
			{ req.checkBody(name, 'Room Name Length must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'player_timeout',
		form_name: 'player_timeout',
		validate: function(req, name)
			{ req.checkBody(name, 'Player timeout must be a positive integer').custom_int({positive: true}); },
		// When sanitizing this for storage in config, convert minutes to milliseconds
		sanitize: function(req, name) { return req.sanitize(name).toInt(10) * 60 * 1000; }
	},
	{
		name: 'contact_email',
		form_name: 'contact_email',
		validate: function(req, name)
			{ req.checkBody(name, 'Contact Email must be a valid email address').isEmail(); },
		sanitize: function(req, name) { return req.sanitize(name).trim(); }
	},
	{
		name: 'smtp.host',
		form_name: 'smtp_host',
		sanitize: function(req, name) { return req.sanitize(name).trim(); }
	},
	{
		name: 'smtp.port',
		form_name: 'smtp_port',
		validate: function(req, name)
			{ req.checkBody(name, 'SMTP Port must be a positive integer').custom_int({positive: true}); },
		sanitize: function(req, name) { return req.sanitize(name).toInt(10); }
	},
	{
		name: 'smtp.username',
		form_name: 'smtp_username',
		sanitize: function(req, name) { return req.body[name] },
	},
	{
		name: 'smtp.password',
		form_name: 'smtp_password',
		sanitize: function(req, name) { return req.body[name] },
		omit_form_data: true
	},
	{
		name: 'smtp.send_as',
		form_name: 'smtp_send_as',
		validate: function(req, name)
			{ req.checkBody(name, 'SMTP Source Email must be a valid email address').isEmail(); },
		sanitize: function(req, name) { return req.sanitize(name).trim(); }
	},
	{
		name: 'super_user_name',
		form_name: 'super_user_name',
		validate: function(req, name)
			{ user.validate_username_field(req, 'super_user_name'); },
		omit_config: true
	},
	{
		name: 'super_user_password',
		form_name: 'super_user_password',
		validate: function(req, name)
			{ user.validate_password_field(req, name); },
		omit_config: true,
		omit_form_data: true
	},
	{
		name: 'super_user_password_confirm',
		form_name: 'super_user_password_confirm',
		validate: function(req, name)
			{ req.checkBody(name, 'Super User passwords do not match').equals(req.body.super_user_password); },
		omit_config: true,
		omit_form_data: true
	}
];

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

	// Try to send an email to make sure the smtp config works
	var email_transport = nodemailer.createTransport(smtpTransport({
		host: config.smtp.host,
		port: config.smtp.port,
		auth: {
			user: config.smtp.username,
			pass: config.smtp.password
		}
	}));
	var email_options = {
		from: config.smtp.send_as,
		to: config.contact_email,
		subject: config.site_name + ' Test Contact',
		text: 'This is a test message sent while configuring your website, ' + config.site_name
	};
	email_transport.sendMail(email_options, function(error, info)
	{
		if (error)
		{
			var errors = [{
				param : ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password'],
				msg   : 'Error sending email: ' + error,
				value : ''}];
			configuration_error(res, errors);
		} else
		{
			// Initialize the tables in the database. This doubles as validating the MYSQL config data
			// (If the connection fails, the MYSQL configuration is wrong)
			database.init().then(function()
			{
				// Now that database and tables exist, create the primary super user.
				var new_user = new user.user_object;
				new_user.username = req.body.super_user_name;
				new_user.password = req.body.super_user_password
				return user.create_primary_superuser(new_user).then(function(data)
				{
					var inserted_user = data[0];
					var added_decks = data[1];
					// Make an array of the standard deck ids
					var standard_deck_ids = [];
					for (var i = 0; i < added_decks.length; i++)
						standard_deck_ids.push(added_decks[i].id);
					configuration.methods.set('standard_decks', standard_deck_ids);
					configuration.methods.set('default_decks', standard_deck_ids);
					// No errors!
					on_configuration_complete(res);
				}).catch(function(err)
				{
					// Got an error sent from the user module
					if (err instanceof user.error && err.code === 'BAD_REQUEST' && err.message == 'Primary Super User already exists')
					{
						// If the only error is that the primary super user already exists, the configuration is complete,
						// just warn the user that no new user was created
						configuration.methods.set('standard_decks', []);
						configuration.methods.set('default_decks', []);
						on_configuration_complete(res, ["Primary Superuser already exists and so was not created"]);
					} else if (err instanceof card.error || err instanceof deck.error)
					{
						var errors = [{
							param : [],
							msg   : 'Error creating standard decks: ' + err.message,
							value : ''}];
						configuration_error(res, errors);
					} else
					{
						var errors = interpret_user_error(err);

						configuration_error(res, errors);
					}
				});
			}, function(err) // Catch mysql errors
			{
				var errors = interpret_mysql_error(err);
				configuration_error(res, errors);
			});
		}
	});
});

// Gets the data from a submitted form specifically for sending
// back to the user to fill into the form we send back
// Omits password fields as these will not be sent back
function get_form_data(request)
{
	var data = {};

	for (var i = 0; i < config_fields.length; i++)
	{
		if (!config_fields[i].omit_form_data)
		{
			var data_value;
			if (config_fields[i].is_checkbox)
			{
				if (request.body[config_fields[i].form_name])
					data_value = true;
				else
					data_value = false;
			} else {
				data_value = request.body[config_fields[i].form_name];
			}
			object_attribute.set(data, config_fields[i].name, data_value);
		}
	}

	return data;
}

function validate_input(req)
{
	for (var i = 0; i < config_fields.length; i++)
	{
		if (config_fields[i].validate)
			config_fields[i].validate(req, config_fields[i].form_name);
	}

	return req.validationErrors();
}

// Gets the configuration data from a submitted request.
// Data is sanitized and returned as a config object
// Super user data is omitted because that is not actually part of the config data
function get_config(req)
{
	var config = {};

	for (var i = 0; i < config_fields.length; i++)
	{
		if (!config_fields[i].omit_config)
		{
			var config_value = config_fields[i].sanitize(req, config_fields[i].form_name);
			object_attribute.set(config, config_fields[i].name, config_value);
		}
	}

	return config;
}

// Sets each config value
function set_config(config)
{
	for (var i = 0; i < config_fields.length; i++)
	{
		if (!config_fields[i].omit_config)
		{
			var config_value = object_attribute.get(config, config_fields[i].name);

			configuration.methods.set(config_fields[i].name, config_value);
		}
	}
	configuration.properties.is_configured = true;
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
	configuration.properties.is_configured = false;
	res.set_validation_errors(errors);
	res.render('configure', {state: state, form_data: form_data});
	return;
}

// Normally, MYSQL errors will not be explicitly shown to the user, but for configuration it
// is less important to conceal these from the user (since the user is actually the website admin)
// and the user needs to know why their MYSQL configuration is not working.
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
	if (err.code == 'BAD_USERNAME' || err.code == 'DUP_USERNAME')
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
	res.set_validation_errors(errors);
	res.render('configure', {state: state, form_data: form_data, messages: messages});
}

module.exports = router;

