// Requires room_socket
var timeout = {};

room_socket.on('timeout_expired', function()
{
	window.location = '/game/user_timeout_expired';
});
