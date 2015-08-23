// Requires room_socket

$(document).ready(function()
{
	// Once the game has ended, force the page to reload. The server will send the
	// waiting room
	room_socket.on('end_game', function()
	{
		window.location.reload(true);
	});
	// If too many players leave and there are now less than three left, this also
	// signals the end of the game
	room_socket.on('player_leave', function(data)
	{
		if (data.fatal)
			window.location.reload(true);
	});
});