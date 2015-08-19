var notification_dialog = {};
// This relies on the modal HTML in layout.jade

// Shows a modal dialog with one button, the appropriate
// handler is called, if given.
// Available Options:
//  - closed_handler Called after modal is closed, regardless of what was clicked
notification_dialog.show = function(title, content, options)
{
	if (!options)
		options = {};
	$(document).ready(function()
	{
		notification_dialog._show(title, content, options);
	});
};

$(document).ready(function()
{
	notification_dialog.dialog_selector = '#standard_modal';
	notification_dialog.title_selector = '#standard_modal h4.modal-title';
	notification_dialog.body_selector = '#standard_modal .modal-body';
	notification_dialog.footer_selector = '#standard_modal .modal-footer';
	notification_dialog.ok_button_id = 'notification_dialog-ok_button';

	notification_dialog.dialog = $(notification_dialog.dialog_selector);
	notification_dialog.title = $(notification_dialog.title_selector);
	notification_dialog.body = $(notification_dialog.body_selector);
	notification_dialog.footer = $(notification_dialog.footer_selector);

	notification_dialog.footer_content =
		'<button data-dismiss=\'modal\' id=\'' + notification_dialog.ok_button_id + '\' class=\'btn btn-default btn-lg\' type=\'button\'>' +
			'<span style=\'margin-left: 20px; margin-right: 20px;\'>Ok</span>' +
		'</button>';

	notification_dialog._show = function(title, content, options)
	{
		notification_dialog.title.text(title);
		notification_dialog.body.html(content);
		notification_dialog.footer.html(notification_dialog.footer_content);

		// Clean up after ourselves after the modal closes
		notification_dialog.dialog.one('hidden.bs.modal', function() {
			notification_dialog.title.empty();
			notification_dialog.body.empty();
			notification_dialog.footer.empty();

			if (options.closed_handler)
				options.closed_handler();
		});

		notification_dialog.dialog.modal({
			keyboard: false,
			show: true
		});
	};
});
