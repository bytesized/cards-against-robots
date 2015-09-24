// Requires room_socket,
//          yes_no_dialog.js,
//          game/waiting_room/player.js
var timeout = {};
timeout.buffer = 1.5 * 60 * 1000; // 1.5 minute in milliseconds
timeout.timer = null;

timeout.init = function(milliseconds)
{
	timeout.expires_in(milliseconds);
};

timeout.expires_in = function(milliseconds)
{
	if (timeout.timer)
		clearTimeout(timeout.timer);

	if (milliseconds > timeout.buffer)
	{
		timeout.timer = setTimeout(timeout.warn, milliseconds - timeout.buffer);
	} else
	{
		timeout.timer = null;
		timeout.warn();
	}
};

timeout.reset = function()
{
	timeout.expires_in(config.player_timeout);
}

// Only warns you if you are the host
timeout.warn = function()
{
	if (player.is_host)
	{
		yes_no_dialog.show(
			'Room Expiration Imminent',
			'<p>We have detected that this room is idle and we will close it in 1 minute. Would you like to keep this room open?</p>',
			{
				yes_handler: function()
				{
					room_socket.emit('reset_timer');
				}
			});
	}
};

room_socket.on('reset_timer', function()
{
	timeout.reset();
});

player.on_count_change(function(count, increased)
{
	if (increased)
		timeout.reset();
})

room_socket.on('timeout_expired', function()
{
	window.location = '/game/game_timeout_expired';
});
