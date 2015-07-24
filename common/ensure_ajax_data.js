"use strict";
// This module provides middleware functions for ensuring that the correct data
// was sent with the AJAX request.

var ensure_data_exists = function()
{
	var required_data = arguments;
	return function(req, res, next)
	{
		for (var i = 0; i < required_data.length; i++)
		{
			if (req.body[required_data[i]] === undefined)
			{
				res.json({ error: 'Internal Error: Missing Data' });
				return;
			}
		}

		// If `for` loop didn't `return`, all the data must be present
		next();
	}
}

module.exports = {
	exists : ensure_data_exists
};
