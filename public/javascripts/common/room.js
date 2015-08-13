// Client-side requires: validator.min.js
if ((typeof module) !== 'undefined')
{
	var path = require('path');
	var validator = require('validator');
	var config = require(path.normalize(path.join(__dirname, '..', '..', '..', 'configuration')));
}

var room = {};

room.error = function(message, code)
{
	var error = Error.call(this, message);

	this.name = 'RoomError';
	this.message = error.message;
	this.stack = error.stack;
	this.code = code;
}
room.error.prototype = Object.create(Error.prototype);
room.error.prototype.constructor = room.error;

room.room_object = (function() {
	// Constructor.
	function room_object()
	{
		this.id                   = null;
		this.publicly_listed      = null;
		this.name                 = null;
		this.password             = null;
		this.objective            = null;
		this.hand_size            = null;
		this.max_players          = null;
		this.redraws              = null;
		this.decks                = null;
		this.players              = {};
		this.player_list          = [];
		this.waiting_players      = {};
		this.waiting_list         = [];
		this.host                 = null;
		this.deck                 = null;
		this.started              = false;
		this.chat                 = [];
		this.current_game         = {};
	};
	return room_object;
})();

// Internal Validation functions. By specifying the validation functions in this manner,
// they can be used with express-validation, which does not support validation functions
// returning error messages.
room.room_name_validation_fns =
[
	{
		fn: function(room_name)
		{
			if (room_name.length < 4)
				return false;
			else if (config.properties.is_configured && room_name.length > config.field_sizes.room_name)
				return false;
			else
				return true;
		},
		msg: function(room_name)
		{
			if (config.properties.is_configured)
				return "Room Name must be 4-" + config.field_sizes.room_name + " characters long";
			else
				return "Room Name must be more than 4 characters long";
		}
	},
	{
		fn: function(room_name)
		{
			if (room_name.match(/^[-a-zA-Z0-9_+=:().&%$^*!? ]*$/) == null)
				return false;
			else
				return true;
		},
		msg: function(room_name)
		{
			return "Room Name may only contain letters, numbers, spaces, and these special characters: -,_,+,=,:,(,),.,&,%,$,^,*,!,?";
		}
	}
];

room.password_validation_fns =
[
];

room.objective_validation_fns =
[
	{
		fn: function(candidate)
		{
			if (validator.isInt(candidate, 10))
			{
				candidate = validator.toInt(candidate, 10);
				if (candidate >= 1 && candidate <= 50)
					return true;
			}
			return false;
		},
		msg: function(candidate)
		{
			return 'Objective must be an integer between 1 and 50';
		}
	}
];

room.hand_size_validation_fns =
[
	{
		fn: function(candidate)
		{
			if (validator.isInt(candidate, 10))
			{
				candidate = validator.toInt(candidate, 10);
				if (candidate >= 2 && candidate <= 40)
					return true;
			}
			return false;
		},
		msg: function(candidate)
		{
			return 'Hand Size must be an integer between 2 and 40';
		}
	}
];

room.max_players_validation_fns =
[
	{
		fn: function(candidate)
		{
			if (validator.isInt(candidate, 10))
			{
				candidate = validator.toInt(candidate, 10);
				if (candidate >= 3 && candidate <= 25)
					return true;
			}
			return false;
		},
		msg: function(candidate)
		{
			return 'Maximum Players value must be an integer between 3 and 25';
		}
	}
];

room.redraws_validation_fns =
[
	{
		fn: function(candidate)
		{
			if (validator.isInt(candidate, 10))
			{
				candidate = validator.toInt(candidate, 10);
				if (candidate >= 0)
					return true;
			}
			return false;
		},
		msg: function(candidate)
		{
			return 'Number of Redraws must be a positive integer';
		}
	}
];

room.decks_validation_fns =
[
	{
		fn: function(deck_list)
		{
			if (deck_list.length > 0)
				return true;
			else
				return false;
		},
		msg: function(deck_list)
		{
			return 'At least one deck must be chosen';
		}
	}
];

room.room_validation_fns =
[
	{
		fn: function(candidate)
		{
			if (typeof candidate.publicly_listed === 'boolean')
				return true;
			else
				return false;
		},
		msg: function(candidate)
		{
			return 'Publicly Listed attribute not found';
		}
	},
	{
		fn: function(candidate)
		{
			if (typeof candidate.host === 'number')
				return true;
			else
				return false;
		},
		msg: function(candidate)
		{
			return 'Host not found';
		}
	},
	{
		fn: function(candidate)
		{
			if (typeof candidate.objective === 'number')
				return true;
			else
				return false;
		},
		msg: function(candidate)
		{
			return 'Objective in invalid format';
		}
	},
	{
		fn: function(candidate)
		{
			if (typeof candidate.hand_size === 'number')
				return true;
			else
				return false;
		},
		msg: function(candidate)
		{
			return 'Hand Size in invalid format';
		}
	},
	{
		fn: function(candidate)
		{
			if (typeof candidate.max_players === 'number')
				return true;
			else
				return false;
		},
		msg: function(candidate)
		{
			return 'Maximum Players in invalid format';
		}
	},
	{
		fn: function(candidate)
		{
			if (typeof candidate.redraws === 'number')
				return true;
			else
				return false;
		},
		msg: function(candidate)
		{
			return 'Redraws in invalid format';
		}
	}
];

// Throws an error if the room name is invalid
// Does not check if the room name exists
room.check_room_name = function(candidate)
{
	for (var i = 0; i < room.room_name_validation_fns.length; i++)
	{
		if (!room.room_name_validation_fns[i].fn(candidate))
			throw new room.error(room.room_name_validation_fns[i].msg(candidate), 'BAD_ROOM_NAME');
	}
};

room.check_password = function(candidate)
{
	for (var i = 0; i < room.password_validation_fns.length; i++)
	{
		if (!room.password_validation_fns[i].fn(candidate))
			throw new room.error(room.password_validation_fns[i].msg(candidate), 'BAD_PASSWORD');
	}
};

room.check_objective = function(candidate)
{
	for (var i = 0; i < room.objective_validation_fns.length; i++)
	{
		if (!room.objective_validation_fns[i].fn(candidate))
			throw new room.error(room.objective_validation_fns[i].msg(candidate), 'BAD_OBJECTIVE');
	}
};

room.check_hand_size = function(candidate)
{
	for (var i = 0; i < room.hand_size_validation_fns.length; i++)
	{
		if (!room.hand_size_validation_fns[i].fn(candidate))
			throw new room.error(room.hand_size_validation_fns[i].msg(candidate), 'BAD_HAND_SIZE');
	}
};

room.check_max_players = function(candidate)
{
	for (var i = 0; i < room.max_players_validation_fns.length; i++)
	{
		if (!room.max_players_validation_fns[i].fn(candidate))
			throw new room.error(room.max_players_validation_fns[i].msg(candidate), 'BAD_MAX_PLAYERS');
	}
};

room.check_redraws = function(candidate)
{
	for (var i = 0; i < room.redraws_validation_fns.length; i++)
	{
		if (!room.redraws_validation_fns[i].fn(candidate))
			throw new room.error(room.redraws_validation_fns[i].msg(candidate), 'BAD_REDRAWS');
	}
};

room.check_decks = function(candidate)
{
	for (var i = 0; i < room.decks_validation_fns.length; i++)
	{
		if (!room.decks_validation_fns[i].fn(candidate))
			throw new room.error(room.decks_validation_fns[i].msg(candidate), 'BAD_DECKS');
	}
};

// Throws an error if the room is invalid. Includes all above validity checks
// The only check this does not include is the (server-side) check for the required
// number of black cards
room.check_room = function(candidate)
{
	for (var i = 0; i < room.room_validation_fns.length; i++)
	{
		if (!room.room_validation_fns[i].fn(candidate))
			throw new room.error(room.room_validation_fns[i].msg(candidate), 'BAD_ROOM_ATTRIBUTES');
	}
	room.check_room_name(candidate.name);
	room.check_password(candidate.password);
	room.check_objective(candidate.objective);
	room.check_hand_size(candidate.hand_size);
	room.check_max_players(candidate.max_players);
	room.check_redraws(candidate.redraws);
	room.check_decks(candidate.decks);
};

if ((typeof module) !== 'undefined')
	module.exports = room;

