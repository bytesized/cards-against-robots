"use strict";
// Returns a configuration object for express-validator
var path = require('path');
var validator = require('validator');

var custom_validators = {
	custom_int: function(param, options)
	{
		param = validator.toInt(param, 10);
		if (isNaN(param))
			return false;
		if (options.positive && param <= 0)
			return false;
		if (options.even && param % 2 != 0)
			return false;
		return true;
	},
	is_not: function(param, comparison, case_insensitive)
	{
		if (case_insensitive)
		{
			param = param.toLowerCase();
			comparison = comparison.toLowerCase();
		}
		if (param == comparison)
			return false;
		else
			return true;
	}
};

module.exports = {
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
	customValidators: custom_validators
};