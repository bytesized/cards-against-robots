// Provides chat window styling for the game chat (but not for the waiting room chat,
// which is simpler)

$(document).ready(function()
{
	$('#chat').resizable({
		handles: {
			'sw': '#chat_handle_sw'
		},
		minHeight: config.card.height,
		minWidth: config.card.width,
		resize: function(event, ui)
		{
			// Do not change the value of `left`, we are already floating left
			ui.position.left = ui.originalPosition.left;
			// We want the bottom margin to take up a multiple of the card height
			// so that we do not attempt to put cards there
			// Since we have set the minimum height to one card's height, we can
			// assume that the chat window will be at least that long
			var card_height = config.card.height + (config.card.margin * 2);
			// Compute window (outer) size, without the bottom margin
			var outer_size = ui.size.height + config.card.margin;
			var total_height = Math.ceil(outer_size / card_height) * card_height;
			var bottom_margin = total_height - outer_size;
			// We want a minimum margin. If we are less than that, add another whole card on
			if (bottom_margin < config.card.margin)
				bottom_margin += card_height;
			$('#chat').css('margin-bottom', bottom_margin + 'px');
		}
	});
});