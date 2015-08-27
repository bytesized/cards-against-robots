"use strict";
var express = require('express');
var path = require('path');
var email_transporter = require(path.normalize(path.join(__dirname, '..', 'common', 'email_transporter')));
var html = require(path.normalize(path.join(__dirname, '..', 'common', 'html')));
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));
var router = express.Router();

/* GET contact page */
router.get('/', function(req, res, next)
{
	var user = get_user(req);
	res.render('contact', {form_data: {}, user: user});
});

router.post('/', function(req, res, next)
{
	var user = get_user(req);
	req.checkBody('message', 'Message cannot be empty').notEmpty();

	var errors = 	req.validationErrors();
	if (errors)
	{
		res.set_validation_errors(errors);
		res.render('contact', {form_data: req.body, user: user});
	} else
	{
		var name = req.body.name;
		var html_name;
		if (!name || name === '')
		{
			name = 'Unspecified';
			html_name = '<i>Unspecified</i>';
		} else
		{
			html_name = html.encode(name);
		}
		var email = req.body.email;
		var html_email;
		if (!email || email === '')
		{
			email = 'Unspecified';
			html_email = '<i>Unspecified</i>';
		} else
		{
			html_email = html.encode(email);
		}
		var message = req.body.message;
		var html_message = html.encode(message);
		// Send an email to the contact email address
		var email_options = {
			from: config.smtp.send_as,
			to: config.contact_email,
			subject: config.site_name + ' Form Contact',
			text: 'Name: ' + name + '\nEmail: ' + email + '\n\nMessage:\n' + message + '\n\n',
			html: 'Name: ' + html_name + '<br>Email: ' + html_email + '<br><br>Message:<br>' + html_message + '<br><br>'
		};
		email_transporter.sendMail(email_options, function(error, info)
		{
			if (error)
				req.flash('error', error);
			else
				req.flash('success', 'Message Sent');
			res.render('contact', {form_data: req.body, user: user});
		});
	}
});

function get_user(req)
{
	if (req.isAuthenticated())
		return req.user;
	else
		return null;
};

module.exports = router;
