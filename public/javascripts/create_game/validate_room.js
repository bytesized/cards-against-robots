// Used to validate user input for the create game page
// Requires common/room.js
// Assumptions: All inputs passed to `set_input` functions are each contained within
//              a `.form_group`. The classes `has-error` and `has-success` will be
//              applied to it
var validate_room = {};

validate_room.room_name = {};
validate_room.room_name.prevent_popover_close = false;
validate_room.room_name.set_input = function(selector)
{
	$(document).ready(function()
	{
		$(selector).popover({
			title: 'Invalid Room Name',
			content: function()
			{
				return $(selector).data('validate_room.room_name.error');
			},
			placement: 'auto',
			animation: true,
			container: 'body',
			trigger: 'manual'
		});
		$(selector).on('blur', function()
		{
			validate_room.room_name.do_validation(selector);
		});
		$(selector).on('focus', function()
		{
			$(selector).popover('hide');
		});
		$('body').on('click.validate_room.room_name', function()
		{
			if (!validate_room.room_name.prevent_popover_close)
				$(selector).popover('hide');
		});
	});
};

validate_room.room_name.do_validation = function(selector)
{
	var room_name = $(selector).val();
	$(selector).closest('.form-group').removeClass('has-error');
	$(selector).closest('.form-group').removeClass('has-success');

	if (room_name.length === 0)
	{
		$(selector).closest('.form-group').addClass('has-error');
		return;
	}

	try
	{
		room.check_room_name(room_name);
	} catch(err)
	{
		$(selector).closest('.form-group').addClass('has-error');
		$(selector).data('validate_room.room_name.error', err.message);
		$(selector).popover('show');
		validate_room.room_name.prevent_popover_close = true;
		setTimeout(function()
		{
			validate_room.room_name.prevent_popover_close = false;
		}, 500);
		return;
	}

	$(selector).closest('.form-group').addClass('has-success');
};

validate_room.password = {};
validate_room.password.prevent_popover_close = false;
validate_room.password.set_input = function(selector)
{
	$(document).ready(function()
	{
		$(selector).popover({
			title: 'Invalid Password',
			content: function()
			{
				return $(selector).data('validate_room.password.error');
			},
			placement: 'auto',
			animation: true,
			container: 'body',
			trigger: 'manual'
		});
		$(selector).on('blur', function()
		{
			validate_room.password.do_validation(selector);
		});
		$(selector).on('focus', function()
		{
			$(selector).popover('hide');
		});
		$('body').on('click.validate_room.password', function()
		{
			if (!validate_room.password.prevent_popover_close)
				$(selector).popover('hide');
		});
	});
};

validate_room.password.do_validation = function(selector)
{
	var password = $(selector).val();
	$(selector).closest('.form-group').removeClass('has-error');
	$(selector).closest('.form-group').removeClass('has-success');

	try
	{
		room.check_password(password);
	} catch(err)
	{
		$(selector).closest('.form-group').addClass('has-error');
		$(selector).data('validate_room.password.error', err.message);
		$(selector).popover('show');
		validate_room.password.prevent_popover_close = true;
		setTimeout(function()
		{
			validate_room.password.prevent_popover_close = false;
		}, 500);
		return;
	}

	$(selector).closest('.form-group').addClass('has-success');
};

validate_room.objective = {};
validate_room.objective.prevent_popover_close = false;
validate_room.objective.set_input = function(selector)
{
	$(document).ready(function()
	{
		$(selector).popover({
			title: 'Invalid Objective',
			content: function()
			{
				return $(selector).data('validate_room.objective.error');
			},
			placement: 'auto',
			animation: true,
			container: 'body',
			trigger: 'manual'
		});
		$(selector).on('blur', function()
		{
			validate_room.objective.do_validation(selector);
		});
		$(selector).on('focus', function()
		{
			$(selector).popover('hide');
		});
		$('body').on('click.validate_room.objective', function()
		{
			if (!validate_room.objective.prevent_popover_close)
				$(selector).popover('hide');
		});
	});
};

validate_room.objective.do_validation = function(selector)
{
	var objective = $(selector).val();
	$(selector).closest('.form-group').removeClass('has-error');
	$(selector).closest('.form-group').removeClass('has-success');

	if (objective.length === 0)
	{
		$(selector).closest('.form-group').addClass('has-error');
		return;
	}

	try
	{
		if (!validator.isInt(objective, 10))
			throw new room.error('Objective must be an integer', 'BAD_OBJECTIVE');
		else
			objective = validator.toInt(objective, 10);
		room.check_objective(objective);
	} catch(err)
	{
		$(selector).closest('.form-group').addClass('has-error');
		$(selector).data('validate_room.objective.error', err.message);
		$(selector).popover('show');
		validate_room.objective.prevent_popover_close = true;
		setTimeout(function()
		{
			validate_room.objective.prevent_popover_close = false;
		}, 500);
		return;
	}

	$(selector).closest('.form-group').addClass('has-success');
};

validate_room.hand_size = {};
validate_room.hand_size.prevent_popover_close = false;
validate_room.hand_size.set_input = function(selector)
{
	$(document).ready(function()
	{
		$(selector).popover({
			title: 'Invalid Hand Size',
			content: function()
			{
				return $(selector).data('validate_room.hand_size.error');
			},
			placement: 'auto',
			animation: true,
			container: 'body',
			trigger: 'manual'
		});
		$(selector).on('blur', function()
		{
			validate_room.hand_size.do_validation(selector);
		});
		$(selector).on('focus', function()
		{
			$(selector).popover('hide');
		});
		$('body').on('click.validate_room.hand_size', function()
		{
			if (!validate_room.hand_size.prevent_popover_close)
				$(selector).popover('hide');
		});
	});
};

validate_room.hand_size.do_validation = function(selector)
{
	var hand_size = $(selector).val();
	$(selector).closest('.form-group').removeClass('has-error');
	$(selector).closest('.form-group').removeClass('has-success');

	if (hand_size.length === 0)
	{
		$(selector).closest('.form-group').addClass('has-error');
		return;
	}

	try
	{
		if (!validator.isInt(hand_size, 10))
			throw new room.error('Hand Size must be an integer', 'BAD_HAND_SIZE');
		else
			hand_size = validator.toInt(hand_size, 10);
		room.check_hand_size(hand_size);
	} catch(err)
	{
		$(selector).closest('.form-group').addClass('has-error');
		$(selector).data('validate_room.hand_size.error', err.message);
		$(selector).popover('show');
		validate_room.hand_size.prevent_popover_close = true;
		setTimeout(function()
		{
			validate_room.hand_size.prevent_popover_close = false;
		}, 500);
		return;
	}

	$(selector).closest('.form-group').addClass('has-success');
};

validate_room.max_players = {};
validate_room.max_players.prevent_popover_close = false;
validate_room.max_players.set_input = function(selector)
{
	$(document).ready(function()
	{
		$(selector).popover({
			title: 'Invalid Maximum Number of Players',
			content: function()
			{
				return $(selector).data('validate_room.max_players.error');
			},
			placement: 'auto',
			animation: true,
			container: 'body',
			trigger: 'manual'
		});
		$(selector).on('blur', function()
		{
			validate_room.max_players.do_validation(selector);
		});
		$(selector).on('focus', function()
		{
			$(selector).popover('hide');
		});
		$('body').on('click.validate_room.max_players', function()
		{
			if (!validate_room.max_players.prevent_popover_close)
				$(selector).popover('hide');
		});
	});
};

validate_room.max_players.do_validation = function(selector)
{
	var max_players = $(selector).val();
	$(selector).closest('.form-group').removeClass('has-error');
	$(selector).closest('.form-group').removeClass('has-success');

	if (max_players.length === 0)
	{
		$(selector).closest('.form-group').addClass('has-error');
		return;
	}

	try
	{
		if (!validator.isInt(max_players, 10))
			throw new room.error('Maximum Players value must be an integer', 'BAD_MAX_PLAYERS');
		else
			max_players = validator.toInt(max_players, 10);
		room.check_max_players(max_players);
	} catch(err)
	{
		$(selector).closest('.form-group').addClass('has-error');
		$(selector).data('validate_room.max_players.error', err.message);
		$(selector).popover('show');
		validate_room.max_players.prevent_popover_close = true;
		setTimeout(function()
		{
			validate_room.max_players.prevent_popover_close = false;
		}, 500);
		return;
	}

	$(selector).closest('.form-group').addClass('has-success');
};

validate_room.redraws = {};
validate_room.redraws.prevent_popover_close = false;
validate_room.redraws.set_input = function(selector)
{
	$(document).ready(function()
	{
		$(selector).popover({
			title: 'Invalid Redraws',
			content: function()
			{
				return $(selector).data('validate_room.redraws.error');
			},
			placement: 'auto',
			animation: true,
			container: 'body',
			trigger: 'manual'
		});
		$(selector).on('blur', function()
		{
			validate_room.redraws.do_validation(selector);
		});
		$(selector).on('focus', function()
		{
			$(selector).popover('hide');
		});
		$('body').on('click.validate_room.redraws', function()
		{
			if (!validate_room.redraws.prevent_popover_close)
				$(selector).popover('hide');
		});
	});
};

validate_room.redraws.do_validation = function(selector)
{
	var redraws = $(selector).val();
	$(selector).closest('.form-group').removeClass('has-error');
	$(selector).closest('.form-group').removeClass('has-success');

	if (redraws.length === 0)
	{
		$(selector).closest('.form-group').addClass('has-error');
		return;
	}

	try
	{
		if (!validator.isInt(redraws, 10))
			throw new room.error('Redraws value must be a postive integer', 'BAD_REDRAWS');
		else
			redraws = validator.toInt(redraws, 10);
		room.check_redraws(redraws);
	} catch(err)
	{
		$(selector).closest('.form-group').addClass('has-error');
		$(selector).data('validate_room.redraws.error', err.message);
		$(selector).popover('show');
		validate_room.redraws.prevent_popover_close = true;
		setTimeout(function()
		{
			validate_room.redraws.prevent_popover_close = false;
		}, 500);
		return;
	}

	$(selector).closest('.form-group').addClass('has-success');
};

// Unlike the other validators, this validation happens on form submit.
validate_room.decks = {};
validate_room.decks.prevent_popover_close = false;
validate_room.decks.set_input = function(button_selector, input_selector)
{
	$(document).ready(function()
	{
		$(button_selector).popover({
			title: 'Invalid Deck Selection',
			content: function()
			{
				return $(button_selector).data('validate_room.decks.error');
			},
			placement: 'auto',
			animation: true,
			container: 'body',
			trigger: 'manual'
		});
		$(button_selector).on('click.validate_room.decks', function(event)
		{
			validate_room.decks.do_validation(event, button_selector, input_selector);
		});
		$('body').on('click.validate_room.decks', function()
		{
			if (!validate_room.decks.prevent_popover_close)
				$(button_selector).popover('hide');
		});
	});
};

validate_room.decks.do_validation = function(event, button_selector, input_selector)
{
	event = event || window.event;
	var decks = $(input_selector).val();

	try
	{
		decks = JSON.parse(decks);
		room.check_decks(decks);
	} catch(err)
	{
		event.preventDefault();
		$(button_selector).data('validate_room.decks.error', err.message);
		$(button_selector).popover('show');
		validate_room.decks.prevent_popover_close = true;
		setTimeout(function()
		{
			validate_room.decks.prevent_popover_close = false;
		}, 500);
		return;
	}
};
