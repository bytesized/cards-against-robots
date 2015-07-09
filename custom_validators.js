"use strict";
var validator = require('validator');

module.exports = {
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