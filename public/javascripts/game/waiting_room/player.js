// Requires room_socket,
//          html.js
var player = {};
player.list_seletor = '#player_list';
player.list_row_selector = '.player_list_item'
player.empty_slot_class = 'empty_player_slot';
player.username_class = 'username_text';
player.dummy_button_class = 'dummy_btn';
player.kick_button_class = 'kick_player';
player.kick_button_container_selector = '.flex_noexpand';
player.user_id_data_key = 'user_id';
player.start_button_selector = '#start_button';
player.kick_glyphicon = 'glyphicon-remove';
player.empty_glyphicon = 'glyphicon-unchecked';
player.host_glyphicon = 'glyphicon-star';
player.transfer_glyphicon = 'glyphicon-transfer';
player.open_slot_html = '<i>Open Slot</i>';

player.count_change_fns = [];

$(document).ready(function()
{
	player.list = $(player.list_seletor);
	player.start_button = $(player.start_button_selector);

	// Should be passed button elements
	player.add_tooltips = function(elements)
	{
		elements.tooltip({
			title: 'Kick Player'
		})
	};
	// Initially, add tooltip to non-dummy buttons
	(function()
	{
		var buttons = $('.' + player.kick_button_class);
		// Filter elements with the dummy button class
		buttons = buttons.filter(function(index)
		{
			return !($(this).hasClass(player.dummy_button_class));
		});
		player.add_tooltips(buttons);
	})();

	// Should be passed button elements
	player.remove_tooltips = function(elements)
	{
		elements.tooltip('destroy');
	};

	player.add_player = function(new_player, player_waiting)
	{
		var player_slot = player.list.find('.' + player.empty_slot_class).first();

		var button = player_slot.find('.' + player.kick_button_class);
		player_slot.removeClass(player.empty_slot_class);
		button.find('.glyphicon').attr('class', 'glyphicon ' + player.kick_glyphicon);
		player_slot.data(player.user_id_data_key, new_player.id);
		var username_html;
		if (player_waiting)
			username_html = html.encode(new_player.username);
		else
			username_html = '<b>' + html.encode(new_player.username) + '</b>';
		player_slot.find('.' + player.username_class).html(username_html);
		button.removeClass(player.dummy_button_class);
		button.on('click.player', player.kick);
		player.add_tooltips(player_slot.find('.' + player.kick_button_class));

		player.notify_count_change();
	};
	room_socket.on('player_join', function(data)
	{
		player.add_player(data.user, data.waiting);
	});

	// `data` object passed in through the socket
	// `data.id` should be the id of the removed player
	// `data.new_host`, if defined, is the new player that will be the host
	player.remove_player = function(data)
	{
		var player_slot = player.list.find(player.list_row_selector).filter(function(index)
		{
			if ($(this).hasClass(player.dummy_button_class))
				return false;
			if (!$(this).data(player.user_id_data_key))
				return false;

			return $(this).data(player.user_id_data_key).toString() === data.player.toString();
		}).first();

		var button = player_slot.find('.' + player.kick_button_class);
		player.remove_tooltips(button);
		button.addClass(player.dummy_button_class);
		player_slot.find('.' + player.username_class).html(player.open_slot_html);
		player_slot.removeAttr('data-' + player.user_id_data_key);
		player_slot.removeData(player.user_id_data_key);
		button.find('.glyphicon').attr('class', 'glyphicon ' + player.empty_glyphicon);
		player_slot.addClass(player.empty_slot_class);

		// Move empty row to the end of the list
		var player_slot_html = player_slot.outer_html();
		player_slot.remove();
		player.list.append(player_slot);

		player.notify_count_change();

		if (data.new_host)
			player.set_host(data.new_host);
	};
	room_socket.on('player_leave', function(data)
	{
		player.remove_player(data);
	});

	player.set_host = function(new_host)
	{
		var host_slot = player.list.find(player.list_row_selector).filter(function(index)
		{
			if ($(this).hasClass(player.dummy_button_class))
				return false;
			if (!$(this).data(player.user_id_data_key))
				return false;

			return $(this).data(player.user_id_data_key).toString() === new_host.toString();
		}).first();

		host_slot.find('.' + player.kick_button_class).find('.glyphicon').attr('class', 'glyphicon ' + player.host_glyphicon);

		if (new_host === current_user.id)
			player.become_host();
	};

	player.become_host = function()
	{
		player.list.find('.' + player.kick_button_class).closest(player.kick_button_container_selector).show();
		player.start_button.show();
	};

	player.kicked = function()
	{
		window.location = '/game/kicked';
	};
	room_socket.on('kick', function()
	{
		player.kicked();
	});

	player.kick = function(event)
	{
		event = event || window.event;
		var target = event.target || event.srcElement;

		var kick_row = $(target).closest(player.list_row_selector);
		var to_kick = kick_row.data(player.user_id_data_key);
		kick_row.find('.' + player.kick_button_class).find('.glyphicon').attr('class', 'glyphicon ' + player.transfer_glyphicon);
		room_socket.emit('kick', to_kick);
	};
	// Initially, connect kick signals for all non-dummy buttons
	(function()
	{
		var buttons = $('.' + player.kick_button_class);
		// Filter elements with the dummy button class
		buttons = buttons.filter(function(index)
		{
			return !($(this).hasClass(player.dummy_button_class));
		});
		buttons.on('click.player', player.kick);
	})();

	// Returns the number of players in the game
	player.count = function()
	{
		return player.list.find(player.list_row_selector).filter(function(index)
		{
			return (typeof $(this).data(player.user_id_data_key) !== 'undefined');
		}).length;
	};

	// Calls the given function with the new player count as an argument whenever
	// the player count changes
	player.on_count_change = function(fn)
	{
		player.count_change_fns.push(fn);
	};

	player.notify_count_change = function()
	{
		var count = player.count();
		for (var i = 0; i < player.count_change_fns.length; i++)
			player.count_change_fns[i](count);
	};
});
