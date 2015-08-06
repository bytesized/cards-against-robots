// Requires socket,
//          html.js
var chat = {};
chat.button_selector = '#chat-button';
chat.input_selector = '#chat-input';
chat.window_selector = '#chat-window';

$(document).ready(function()
{
	chat.button = $(chat.button_selector);
	chat.input = $(chat.input_selector);
	chat.window = $(chat.window_selector);

	chat.input.keyup(function(event)
	{
		event = event || window.event;
		if (event.keyCode === 13)
			chat.button.click();
	});

	chat.send_message = function()
	{
		var text = chat.input.val();
		chat.input.val('');

		socket.emit('room.chat', text);
	};
	chat.button.on('click.chat', chat.send_message);

	socket.on('room.chat', function(msg_json)
	{
		console.log('Received');
		msg = JSON.parse(msg_json);
		chat.window.append('<p><b>' + html.encode(msg.username) + ':</b> ' + html.encode(msg.text) + '</p>');
	});
});