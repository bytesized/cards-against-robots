var validator = require('validator');

module.exports = {
	custom_int: function(param, options)
	{
		param = validator.toInt(param);
		if (isNaN(param))
			return false;
		if (options.positive && param <= 0)
			return false;
		if (options.even && param % 2 != 0)
			return false;
		return true;
	}
};