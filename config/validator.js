"use strict";
// Returns a configuration object for express-validator
var path = require('path');
var validator = require('validator');
var validator_common = require(path.normalize(path.join(__dirname, '..', 'public', 'javascripts', 'common', 'custom_validators')));

var options = {
	errorFormatter: function(param, msg, value)
	{
		// Return the param value in an array so that when we emulate this error structure for other errors,
		// we can specify that there is a problem with multiple parameters and safely iterate over them
		return {
			param : [param],
			msg   : msg,
			value : value
		};
	},
	customValidators: validator_common.custom_validators
};

// middleware that adds validation related functionality to the response
var middleware = function(req, res, next)
{
	// `res.locals.input_status` will be an object holding bootstrap classes to be applied to various
	// form inputs. The jade usage of this variable is:
	//     .form-group(class=input_status.form_input_name)
	// or:
	//     .input-group(class=input_status.form_input_name)
	res.locals.input_status = {};
	// This is used by the jade `validation_errors` mixin (in layout.jade)
	res.locals.validation_error_list = {};
	// This `res` method sets `res.locals.input_status` properties to 'has-error' if they are in
	// the error array given. The intended usage of this function is:
	//     var errors = express-validator.validationErrors();
	//     res.set_validation_errors(errors)
	res.set_validation_errors = function(errors)
	{
		if (errors)
		{
			res.locals.validation_error_list = errors;
			for (var i = 0; i < errors.length; i++)
			{
				var error_params = errors[i].param;
				for (var j = 0; j < error_params.length; j++)
					res.locals.input_status[error_params[j]] = 'has-error';
			}
		}
	}
	next();
}

module.exports = {
	options    : options,
	middleware : middleware
};