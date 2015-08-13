// Requires room_socket,
//          game/waiting_room/player.js
var start_game = {};
start_game.button_selector = '#start_button';

$(document).ready(function()
{
	start_game.button = $(start_game.button_selector);

	start_game.update_button = function(count)
	{
		if (typeof count === 'undefined')
			count = player.count();

		if (count < 3)
		{
			var needed = 3 - count;
			start_game.button.addClass('disabled');
			start_game.button.text(needed + ' more players needed');
		} else
		{
			start_game.button.removeClass('disabled');
			start_game.button.text('Start Game');
		}
	};
	start_game.update_button();
	player.on_count_change(start_game.update_button);

	start_game.send_start = function()
	{
		if (player.count() < 3)
			return;

		room_socket.emit('start_game');
	};
	start_game.button.on('click.start_game', start_game.send_start);

	// Once the game has started, force the page to reload. The server will send the
	// game page
	room_socket.on('start_game', function()
	{
		window.location.reload(true);
	});
});
