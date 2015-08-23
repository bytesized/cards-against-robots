// Requires notification_dialog.js

$(document).ready(function()
{
	room_socket.on('dup_connection', function(hand)
	{
		notification_dialog.show(
			'Duplicate Connection Detected', 
			'Another socket has connected with the same credentials, indicating that you are logged in elsewhere. You will now be logged out.',
			{
				closed_handler: function()
				{
					window.location = '/user/logout';
				}
			}
			);
	});
});