var express = require('express');
var path = require('path');
var database = require(path.normalize(path.join(__dirname, '..', 'database')));
var fs = require('fs');
var configuration = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var router = express.Router();
var states = {
	unconfigured: 'unconfigured',
	configuring:  'configuring',
	configured:   'configured'
};
var state = states.unconfigured;
var config = {};

router.get('/', function(req, res, next) {
	res.render('configure', {state: state, config: config});
});

/* POST configure request */
router.post('/', function(req, res, next) {
	if (state == states.unconfigured)
	{
		state = states.configuring;
		// Input Validation
		req.checkBody('site_name', 'Site Name is required').notEmpty();
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

		var errors = req.validationErrors();

		if (errors)
		{
			// If there are errors, return input exactly as it is (no sanitization), but don't save it to config
			var fake_config = {};
			fake_config.site_name              = req.body.site_name;
			fake_config.card_icon_filename     = req.body.card_icon;
			fake_config.card_icon_height       = req.body.card_icon_height;
			fake_config.card_icon_width        = req.body.card_icon_width;
			fake_config.mysql                  = {};
			fake_config.mysql.host             = req.body.mysql_host;
			fake_config.mysql.port             = req.body.mysql_port;
			fake_config.mysql.database         = req.body.mysql_database;
			fake_config.mysql.username         = req.body.mysql_username;
			fake_config.mysql.password         = req.body.mysql_password;
			fake_config.mysql.connection_limit = req.body.mysql_connection_limit;
			if (req.body.invitations_required)
				fake_config.invitations_required = true;
			else
				fake_config.invitations_required = false;
			fake_config.token_length           = req.body.token_length;
			fake_config.username_length        = req.body.username_length;
			fake_config.deck_name_length       = req.body.deck_name_length;
			fake_config.card_text_length       = req.body.card_text_length;

			state = states.unconfigured;
			res.render('configure', {state: state, config: fake_config, errors: errors});
		} else
		{
			config = {};
			config.site_name              = req.sanitize('site_name').trim();
			config.card_icon_filename     = req.sanitize('card_icon').trim();
			config.card_icon_height       = req.sanitize('card_icon_height').toInt();
			config.card_icon_width        = req.sanitize('card_icon_width').toInt();
			config.mysql                  = {};
			config.mysql.host             = req.sanitize('mysql_host').trim();
			config.mysql.port             = req.sanitize('mysql_port').toInt();
			config.mysql.database         = req.sanitize('mysql_database').trim();
			config.mysql.username         = req.sanitize('mysql_username').trim();
			config.mysql.password         = req.body.mysql_password;
			config.mysql.connection_limit = req.sanitize('mysql_connection_limit').toInt();
			if (req.body.invitations_required)
				config.invitations_required = true;
			else
				config.invitations_required = false;
			config.token_length           = req.sanitize('token_length').toInt();
			config.username_length        = req.sanitize('username_length').toInt();
			config.deck_name_length       = req.sanitize('deck_name_length').toInt();
			config.card_text_length       = req.sanitize('card_text_length').toInt();

			// Try to read the card image to make sure that it is there
			var card_icon_path = path.normalize(path.join(__dirname, '..', 'public', 'images', config.card_icon_filename));
			try
			{
				fs.readFileSync(card_icon_path);
			} catch (err)
			{
					var errors = [{param: '', msg: 'Error reading card icon: ' + err, value: ''}];

					state = states.unconfigured;
					res.render('configure', {state: state, config: config, errors: errors});
					return;
			}

			database.init(config, function(error)
			{
				if (error)
				{
					// error is a string. Convert it to the format configure.jade expects
					var errors = [{param: '', msg: 'MYSQL Error: ' + error, value: ''}];

					state = states.unconfigured;
					res.render('configure', {state: state, config: config, errors: errors});
				} else
				{
					var errors = null;
					// No MYSQL errors! That was the last config check. Write out the config file
					// and render the page
					try
					{
						fs.writeFileSync(configuration.filename, JSON.stringify(config, null, 4));
						state = states.configured;
					} catch (err) 
					{
						state = states.unconfigured;
						var errors = [{param: '', msg: 'Error writing config file: ' + err, value: ''}];
					}
					res.render('configure', {state: state, config: config, errors: errors});
				}
			});
		}
	}
});

module.exports = router;

