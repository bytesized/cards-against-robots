var yes_no_dialog = {};
// This relies on the modal HTML in layout.jade

// Shows a yes/no dialog modal. After 'Yes' or 'No' has been clicked, the appropriate
// handler is called, if given.
// Available Options:
//  - yes_handler    Called if 'Yes' is clicked (after modal is closed)
//  - no_handler     Called if 'No' is clicked (after modal is closed)
//  - closed_handler Called after modal is closed, regardless of what was clicked
// Note: The modal dialog has an X button in the corner, so it is possible for neither
//       'Yes' nor 'No' to be clicked.
yes_no_dialog.show = function(title, content, options)
{
	$(document).ready(function()
	{
		yes_no_dialog._show(title, content, options);
	});
};

$(document).ready(function()
{
	yes_no_dialog.dialog_selector = '#standard_modal';
	yes_no_dialog.title_selector = '#standard_modal h4.modal-title';
	yes_no_dialog.body_selector = '#standard_modal .modal-body';
	yes_no_dialog.footer_selector = '#standard_modal .modal-footer';
	yes_no_dialog.yes_button_id = 'yes_no_dialog-yes_button';
	yes_no_dialog.no_button_id = 'yes_no_dialog-no_button';

	yes_no_dialog.dialog = $(yes_no_dialog.dialog_selector);
	yes_no_dialog.title = $(yes_no_dialog.title_selector);
	yes_no_dialog.body = $(yes_no_dialog.body_selector);
	yes_no_dialog.footer = $(yes_no_dialog.footer_selector);

	yes_no_dialog.footer_content =
		'<button id=\'' + yes_no_dialog.no_button_id + '\' class=\'btn btn-default btn-lg\' type=\'button\'>' +
			'<span style=\'margin-left: 20px; margin-right: 20px;\'>No</span>' +
		'</button>' +
		'<button id=\'' + yes_no_dialog.yes_button_id + '\' class=\'btn btn-default btn-lg\' type=\'button\'>' +
			'<span style=\'margin-left: 20px; margin-right: 20px;\'>Yes</span>' +
		'</button>';

	yes_no_dialog._show = function(title, content, options)
	{
		yes_no_dialog.title.text(title);
		yes_no_dialog.body.html(content);
		yes_no_dialog.footer.html(yes_no_dialog.footer_content);

		$('#' + yes_no_dialog.yes_button_id).on('click.yes_no_dialog', function()
		{
			yes_no_dialog.on_yes(options);
		});
		$('#' + yes_no_dialog.no_button_id).on('click.yes_no_dialog', function()
		{
			yes_no_dialog.on_no(options);
		});

		// Clean up after ourselves after the modal closes
		yes_no_dialog.dialog.one('hidden.bs.modal', function() {
			yes_no_dialog.title.empty();
			yes_no_dialog.body.empty();
			yes_no_dialog.footer.empty();
		});

		yes_no_dialog.dialog.modal({
			keyboard: false,
			show: true
		});
	};

	yes_no_dialog.on_yes = function(options)
	{
		yes_no_dialog.dialog.one('hidden.bs.modal', function()
		{
			if (options.yes_handler)
				options.yes_handler();
		});
		yes_no_dialog.dialog.modal('hide');
	};

	yes_no_dialog.on_no = function(options)
	{
		yes_no_dialog.dialog.one('hidden.bs.modal', function()
		{
			if (options.no_handler)
				options.no_handler();
		});
		yes_no_dialog.dialog.modal('hide');
	};
});
