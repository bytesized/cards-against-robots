// Client-side requires: validator.min.js
if ((typeof module) !== 'undefined')
{
	var validator = require('validator');
}

var custom_validators = {
	custom_int: function(param, options)
	{
		if (!validator.isInt(param, 10))
			return false;
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
	},
	custom_fn: function(param, fn, options)
	{
		if (!options)
			options = {};
		if (options.hasOwnProperty('override_param'))
			param = options.override_param;
		var result = fn(param);
		if (result)
			return true;
		else
			return false;
	}
};

if ((typeof module) === 'undefined')
{
	// If this is client-side...
	// Extend the validator object with our custom validators
	$.extend(validator, custom_validators);
} else
{
	// If this is a node module...
	module.exports = {
		custom_validators: custom_validators
	};
}