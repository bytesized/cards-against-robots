"use strict";

// Return a middleware function to set 
module.exports = function(req, res, next)
{
	// Intercept the render function to attach the flash messages to
	// `res.local.flash_message_list`
	var orig_render = res.render;
	res.render = function()
	{
		res.locals.flash_message_list = req.flash();
		orig_render.apply(res, arguments);
	}
	next();
}