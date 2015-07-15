"use strict";
var crypto = require('crypto');
// Provides one function, `generate`, which generates the specified amount of random data.
// If random secret generation fails, a message will be printed indicating fallback to 
// a pseudo random. I want users to be warned about this in case this is the type of thing
// they are concerned about. However, if this function ever sees more widespread use, that
// message may need to be shown conditionally or passed back to the caller.
module.exports = {
	generate: function(size, allow_fallback)
	{
		var secret = null;
		try 
		{
			secret = crypto.randomBytes(size);
		} catch (err)
		{
			if (!allow_fallback)
				throw new Error("Unable to generate session key");

			console.log("Warning! Could not generate a random secret! Falling back on pseudo random secret. " +
				"If you want to prevent this fallback, use the -r option.");
			// Don't catch errors from this. If we can't even get pseudo random bytes, throw an error
			secret = crypto.pseudoRandomBytes(size);
		}
		return secret;
	}
};