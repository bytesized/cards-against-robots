if ((typeof module) !== 'undefined')
{
	var path = require('path');
	var config = require(path.normalize(path.join(__dirname, '..', '..', '..', 'configuration')));
}

var user = {};

user.error = function(message, code)
{
	var error = Error.call(this, message);

	this.name = 'UserError';
	this.message = error.message;
	this.stack = error.stack;
	this.code = code;
}
user.error.prototype = Object.create(Error.prototype);
user.error.prototype.constructor = user.error;

user.user_object = (function() {
	// Constructor. Make sure all properties are defined and admin, superuser, and locked
	// are set to their default values.
	function user_object()
	{
		this.id        = null;
		this.username  = null;
		this.password  = null;
		this.admin     = false;
		this.superuser = false;
		this.last_seen = null;
		this.locked    = false;
	};
	return user_object;
})();

// Internal Validation functions. By specifying the validation functions in this manner,
// they can be used with express-validation, which does not support validation functions
// returning error messages.
user.username_validation_fns =
[
	{
		fn: function(username)
		{
			if (username.length < 4)
				return false;
			else if (config.properties.is_configured && username.length > config.field_sizes.username)
				return false;
			else
				return true;
		},
		msg: function(username)
		{
			if (config.properties.is_configured)
				return "Username must be 4-" + config.field_sizes.username + " characters long";
			else
				return "Username must be more than 4 characters long";
		}
	},
	{
		fn: function(username)
		{
			if (username.match(/^[-a-zA-Z0-9_+=:().]*$/) == null)
				return false;
			else
				return true;
		},
		msg: function(username)
		{
			return "Username may only contain letters, numbers, and these special characters: -,_,+,=,:,(,),.";
		}
	}
];

user.password_validation_fns = 
[
	{
		fn: function(password)
		{
			if (password.length < 3)
				return false;
			else
				return true;
		},
		msg: function(password)
		{
			return "Password must be at least 3 characters long";
		}
	}
];

// Does not test if user exists and does not include the
// username and password validation above
user.user_validation_fns = 
[
	{
		fn: function(user_candidate)
		{
			if (user_candidate.admin && !user_candidate.superuser)
				return false;
			else
				return true;
		},
		msg: function(user_candidate)
		{
			return "User cannot be a Super User without being an Administrator";
		}
	}
];

// Throws an error if the username is invalid
// Does not check if the username exists
user.check_username = function(candidate)
{
	for (var i = 0; i < user.username_validation_fns.length; i++)
	{
		if (!user.username_validation_fns[i].fn(candidate))
			throw new user.error(user.username_validation_fns[i].msg(candidate), 'BAD_USERNAME');
	}
};

// Throws an error if the password given is invalid
user.check_password = function(candidate)
{
	for (var i = 0; i < user.password_validation_fns.length; i++)
	{
		if (!user.password_validation_fns[i].fn(candidate))
			throw new user.error(user.password_validation_fns[i].msg(candidate), 'BAD_PASSWORD');
	}
};

// Throws an error if the user is invalid. Includes username and password validity checks
user.check_user = function(candidate)
{
	for (var i = 0; i < user.user_validation_fns.length; i++)
	{
		if (!user.user_validation_fns[i].fn(candidate))
			throw new user.error(user.user_validation_fns[i].msg(candidate), 'BAD_USER_ATTRIBUTES');
	}
	user.check_username(candidate.username);
	user.check_password(candidate.password);
};

if ((typeof module) !== 'undefined')
	module.exports = user;

