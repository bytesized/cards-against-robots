// Provides styling for the game chat/score window (but not for the waiting room chat,
// which is simpler)
var float_window = {};

$(document).ready(function()
{
	// Page measurements. True ONLY for a window >= 1200px, but that is the only time the chat resizes anyways
	float_window.container_width = 1170;
	float_window.container_padding = 15;
	float_window.container_inner_width = float_window.container_width - (2 * float_window.container_padding);
	float_window.card_columns = 5;
	float_window.col_width = (float_window.container_inner_width / float_window.card_columns);
	float_window.card_col_spacing = (float_window.col_width - config.card.width) / 2 // Space along card edges
	float_window.card_height = config.card.height + (config.card.margin * 2);

	$('#game_floater').resizable({
		handles: {
			'sw': $('#floater_handle_sw')
		},
		minHeight: config.card.height,
		minWidth: config.card.width,
		maxWidth: (float_window.container_inner_width - (2 * float_window.card_col_spacing)),
		resize: function(event, ui)
		{
			// Do not change the value of `left`, we are already floating left
			ui.position.left = ui.originalPosition.left;
			// We want the bottom margin to take up a multiple of the card height
			// so that we do not attempt to put cards there
			// Since we have set the minimum height to one card's height, we can
			// assume that the chat window will be at least that long

			// Compute window (outer) size, without the bottom margin
			var outer_size = ui.size.height + config.card.margin;
			var total_height = Math.ceil(outer_size / float_window.card_height) * float_window.card_height;
			var bottom_margin = total_height - outer_size;
			// We want a minimum margin. If we are less than that, add another whole card on
			if (bottom_margin < config.card.margin)
				bottom_margin += float_window.card_height;
			$('#game_floater').css('margin-bottom', bottom_margin + 'px');
		}
	});
});