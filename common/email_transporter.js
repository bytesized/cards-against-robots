"use strict";
var path = require('path');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var config = require(path.normalize(path.join(__dirname, '..', 'configuration')));

module.exports = nodemailer.createTransport(smtpTransport({
	host: config.smtp.host,
	port: config.smtp.port,
	auth: {
		user: config.smtp.username,
		pass: config.smtp.password
	}
}));
