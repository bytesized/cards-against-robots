// Requires room_socket,
//          html.js
// Provides basic chat functionality for the waiting room and the game
var chat = {};
chat.button_selector = '#chat-button';
chat.input_selector = '#chat-input';
chat.window_selector = '#chat-window';
chat.tab_selector = '#chat-tab';
chat.tab_link_selector = chat.tab_selector + ' > a';

$(document).ready(function()
{
	chat.button = $(chat.button_selector);
	chat.input = $(chat.input_selector);
	chat.window = $(chat.window_selector);
	chat.tab = $(chat.tab_selector);
	chat.tab_link = $(chat.tab_link_selector);

	chat.input.keyup(function(event)
	{
		event = event || window.event;
		if (event.keyCode === 13)
			chat.button.click();
	});

	chat.send_message = function()
	{
		var text = chat.input.val();
		if (text == '')
			return;

		chat.input.val('');

		room_socket.emit('chat', text);
	};
	chat.button.on('click.chat', chat.send_message);

	chat.scroll_bottom = function()
	{
		chat.window.scrollTop(chat.window[0].scrollHeight);
	};
	chat.tab_link.on('shown.bs.tab', chat.scroll_bottom);

	chat.notify = function()
	{
		if (!chat.tab.hasClass('active') && !chat.tab_link.hasClass('notify'))
			chat.tab_link.addClass('notify');
	}

	chat.unnotify = function()
	{
		chat.tab_link.removeClass('notify');
	}
	chat.tab_link.on('shown.bs.tab', chat.unnotify);

	chat.receive_message = function(msg)
	{
		if (msg.type === 'chat')
			chat.window.append('<p><b>' + html.encode(msg.username) + ':</b> ' + html.encode(msg.text) + '</p>');
		else if (msg.type === 'notification')
			chat.window.append('<p><i>' + html.encode(msg.text) + '</i></p>');
		else if (msg.type === 'html_notification')
			chat.window.append('<p>' + msg.text + '</p>');

		if (!msg.no_notify)
			chat.notify();

		chat.scroll_bottom();
	};
	room_socket.on('chat', function(msg)
	{
		chat.receive_message(msg);
	});
	room_socket.on('choose_czar_card', function(data)
	{
		chat.receive_message(data.msg);
	});
	chat.window.scrollTop(chat.window[0].scrollHeight);
});
