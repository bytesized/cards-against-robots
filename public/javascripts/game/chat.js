// Requires room_socket,
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

		room_socket.emit('chat', text);
	};
	chat.button.on('click.chat', chat.send_message);

	chat.receive_message = function(msg)
	{
		chat.window.append('<p><b>' + html.encode(msg.username) + ':</b> ' + html.encode(msg.text) + '</p>');

		chat.window.scrollTop(chat.window[0].scrollHeight);
	};
	room_socket.on('chat', function(msg_json)
	{
		var msg = JSON.parse(msg_json);
		chat.receive_message(msg);
	});
	chat.window.scrollTop(chat.window[0].scrollHeight);
});
