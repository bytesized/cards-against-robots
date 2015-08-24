// Requires room_socket,
//          current_user (defined in layout.jade),
//          game/chat.js
var player = {};
player.played_count_selector = '#player-played_count';
player.must_play_count_selector = '#player-must_play_count';
player.score_selector = '.player-score';
player.score_value_selector = '.player-score_value';
player.id_data_key = 'player-id';

player.list = [];
player.czar = null;
player.host = null;

jQuery.fn.get_player_id = function()
{
	var id = this.data(player.id_data_key);
	this.removeAttr('data-' + player.id_data_key);
	if (typeof id === 'string')
	{
		id = parseInt(id, 10);
		this.data(player.id_data_key, id);
	}
	return id;
};

// For every player, find the elements that contain data on that player and store them
// in the player list with the player's other data
player.find_player_elements = function()
{
	for (var i = 0; i < player.list.length; i++)
	{
		var player_object = player.list[i];
		player_object.score_element = $(player.score_selector).filter(function(index)
		{
			return ($(this).data(player.id_data_key) === player_object.id);
		});
	}
};

// Initialize the list of players
player.init = function(player_list, czar_id, host_id)
{
	player.list = player_list;
	player.czar = czar_id;
	player.host = host_id;
	$(document).ready(function()
	{
		player.find_player_elements();
	});
};

// Returns the index of the player object. If no player was found with that id, `null` is returned
player.get_index_by_id = function(id)
{
	for (var i = 0; i < player.list.length; i++)
	{
		if (player.list[i].id === id)
			return i;
	}
	return null;
};

// Returns the player object. If no player was found with that id, `null` is returned
player.get_by_id = function(id)
{
	for (var i = 0; i < player.list.length; i++)
	{
		if (player.list[i].id === id)
			return player.list[i];
	}
	return null;
};

// Returns the number of players that have played
player.get_played_count = function()
{
	var count = 0;
	for (var i = 0; i < player.list.length; i++)
	{
		if (player.list[i].played && player.list[i].id !== player.czar)
			++count;
	}
	return count;
};

$(document).ready(function()
{
	player.played_count = $(player.played_count_selector);
	player.must_play_count = $(player.must_play_count_selector);

	room_socket.on('play_card', function(user_id)
	{
		var player_object = player.get_by_id(user_id);
		player_object.score_element.find('.glyphicon').attr('class', 'glyphicon inline_glyph glyphicon-check');
		player_object.played = true;

		player.played_count.text(player.get_played_count());
	});

	room_socket.on('unplay_card', function(user_id)
	{
		var player_object = player.get_by_id(user_id);
		player_object.score_element.find('.glyphicon').attr('class', 'glyphicon inline_glyph glyphicon-unchecked');
		player_object.played = false;

		player.played_count.text(player.get_played_count());
	});

	// If all cards have been played, mark all the users as having played
	room_socket.on('all_cards_played', function(played_cards)
	{
		for (var i = 0; i < player.list.length; i++)
		{
			var player_object = player.list[i];
			if (player_object.id !== player.czar)
			{
				player_object.score_element.find('.glyphicon').attr('class', 'glyphicon inline_glyph glyphicon-check');
				player_object.played = true;
			}
		}

		player.played_count.text(player.get_played_count());
	});

	room_socket.on('choose_czar_card', function(data)
	{
		player.czar = data.czar;

		for (var i = 0; i < player.list.length; i++)
		{
			var player_object = player.list[i];
			if (player_object.id === player.czar)
			{
				player_object.score_element.find('.glyphicon').attr('class', 'glyphicon inline_glyph glyphicon-certificate');
			} else
			{
				player_object.score_element.find('.glyphicon').attr('class', 'glyphicon inline_glyph glyphicon-unchecked');
				player_object.played = false;
			}
		}

		player.played_count.text(player.get_played_count());

		var winner_value_element = player.get_by_id(data.winner).score_element.find(player.score_value_selector);
		var winner_score = parseInt(winner_value_element.text(), 10);
		++winner_score;
		winner_value_element.text(winner_score);
	});

	room_socket.on('player_leave', function(data)
	{
		if (data.active_player)
			chat.receive_message({type: 'html_notification', text: '<i><b>' + html.encode(data.username) + '</b> has left the game</i>'});
		if (data.new_czar !== null)
		{
			player.czar = data.new_czar;
			czar_object = player.get_by_id(player.czar);
			czar_object.score_element.find('.glyphicon').attr('class', 'glyphicon inline_glyph glyphicon-certificate');
			chat.receive_message({type: 'html_notification', text: '<i><b>' + html.encode(data.new_czar_username) + '</b> is the new card czar</i>'});
		}
		if (data.active_player)
		{
			// Remove the user's score element and update the played count text
			var index = player.get_index_by_id(data.player);
			player.list[index].score_element.remove();
			player.list.splice(index, 1);
			player.played_count.text(player.get_played_count());
			player.must_play_count.text(player.list.length - 1);
		}
		if (data.new_host !== null)
		{
			player.host = data.new_host;
		}
	});
});
