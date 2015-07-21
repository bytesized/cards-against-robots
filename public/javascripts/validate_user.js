// Used to validate username and password within the page
// Assumptions: Username input will be a `form-control` inside an `input-group` a `form-group`
//              The `input-group` should contain the username control and a subsequent
//              `input-group-addon` which should be a `span.glyphicon.glyphicon-remove-circle`
//              Password input will be a `form-control` inside a `form-group`

var validate_user = {};
validate_user.max_attempts = 3;

validate_user.username = {};

validate_user.username.set_input = function(selector)
{
	$(document).ready(function()
	{
		$(selector).popover({
			title: 'Invalid Username',
			content: function()
			{
				return $(selector).data('validate_user.username.error');
			},
			placement: 'auto',
			animation: true,
			container: 'body',
			trigger: 'manual'
		});
		$(selector).on('blur', function()
		{
			validate_user.username.do_validation(selector);
		});
		$(selector).on('focus', function()
		{
			$(selector).popover('hide');
		});
	});
};

// First does all validation possible locally, then (on success) uses an AJAX request to check
// if the username exists yet
validate_user.username.do_validation = function(selector)
{
	var username = $(selector).val();
	$(selector).closest('.input-group').removeClass('has-error');
	$(selector).closest('.input-group').removeClass('has-success');

	if (username.length < 4)
	{
		$(selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
		$(selector).data(
			'validate_user.username.error',
			'Username cannot be less than 4 characters');
		$(selector).popover('show');
		$(selector).closest('.input-group').addClass('has-error');
		return;
	}
	if (username.length > config.field_sizes.username)
	{
		$(selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
		$(selector).data(
			'validate_user.username.error',
			'Username cannot contain more than ' + config.field_sizes.username + ' characters');
		$(selector).popover('show');
		$(selector).closest('.input-group').addClass('has-error');
		return;
	}
	if (username.match(/^[-a-zA-Z0-9_+=:().]*$/) == null)
	{
		$(selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
		$(selector).data(
			'validate_user.username.error',
			'Username may only contain letters, numbers, and these special characters: -,_,+,=,:,(,),.');
		$(selector).popover('show');
		$(selector).closest('.input-group').addClass('has-error');
		return;
	}

	validate_user.username.server_validation(selector);
};

// Do server-side validation via AJAX
validate_user.username.server_validation = function(selector, attempt)
{
	// If attempt is not given, assume that this is the first attempt
	if (!attempt)
		attempt = 1;

	// Show a loading icon while we transfer
	$(selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-transfer');

	var request = $.post('/ajax/user/exists', { username: $(selector).val() }, null, "json");

	request.success(function(data, text_status, jqXHR)
	{
		if (data.exists === false)
		{
			$(selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-ok-circle');
			$(selector).closest('.input-group').addClass('has-success');
		} else 
		{
			$(selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-remove-circle');
			$(selector).closest('.input-group').addClass('has-error');
			$(selector).data(
				'validate_user.username.error',
				'That username already exists');
			$(selector).popover('show');
		}
	});
	request.fail(function(jqXHR, text_status, error_thrown)
	{
		if (attempt < validate_user.max_attempts)
		{
			$(selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-repeat');
			validate_user.username.server_validation(selector, attempt + 1);
		} else
		{
			$(selector).next().find('span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
			$(selector).data(
				'validate_user.username.error',
				'Could not contact the server to determine if that username is in use: ' + error_thrown);
			$(selector).popover('show');
		}
	});
};

validate_user.password = {};

validate_user.password.set_input = function(selector)
{
	$(document).ready(function()
	{
		$(selector).popover({
			title: 'Bad Password',
			content: function()
			{
				return $(selector).data('validate_user.password.error');
			},
			placement: 'auto',
			animation: true,
			trigger: 'manual'
		});
		$(selector).on('blur', function()
		{
			validate_user.password.do_validation(selector);
		});
		$(selector).on('focus', function()
		{
			$(selector).popover('hide');
		});
	});
};

// Password only needs local validation
validate_user.password.do_validation = function(selector)
{
	var password = $(selector).val();
	$(selector).closest('.form-group').removeClass('has-error');
	$(selector).closest('.form-group').removeClass('has-success');

	if (password.length < 3)
	{
		$(selector).data(
			'validate_user.password.error',
			'Password cannot be less than 3 characters');
		$(selector).popover('show');
		$(selector).closest('.form-group').addClass('has-error');
		return;
	}

	$(selector).closest('.form-group').addClass('has-success');
};

validate_user.password_confirm = {};

validate_user.password_confirm.set_input = function(confirm_selector, password_selector)
{
	$(document).ready(function()
	{
		$(confirm_selector).popover({
			title: 'Bad Password Confirmation',
			content: function()
			{
				return $(confirm_selector).data('validate_user.password_confirm.error');
			},
			placement: 'auto',
			animation: true,
			trigger: 'manual'
		});
		$(confirm_selector).on('blur', function()
		{
			validate_user.password_confirm.do_validation(confirm_selector, password_selector);
		});
		$(confirm_selector).on('focus', function()
		{
			$(confirm_selector).popover('hide');
		});
		$(password_selector).on('change', function()
		{
			$(confirm_selector).closest('.form-group').removeClass('has-error');
			$(confirm_selector).closest('.form-group').removeClass('has-success');
			$(confirm_selector).popover('hide');
		})
	});
};

// Password only needs local validation
validate_user.password_confirm.do_validation = function(confirm_selector, password_selector)
{
	var password = $(password_selector).val();
	$(confirm_selector).closest('.form-group').removeClass('has-error');
	$(confirm_selector).closest('.form-group').removeClass('has-success');

	if ($(password_selector).val() !== $(confirm_selector).val())
	{
		$(confirm_selector).data(
			'validate_user.password_confirm.error',
			'Password confirmation does not match password');
		$(confirm_selector).popover('show');
		$(confirm_selector).closest('.form-group').addClass('has-error');
		return;
	}

	$(confirm_selector).closest('.form-group').addClass('has-success');
};
