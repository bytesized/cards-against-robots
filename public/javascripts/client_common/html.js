// Some HTML manipulation functions
// In addition to functions in the `html` 'namespace', also adds some
// Jquery functionality

var html = {};

html.encode = function(value)
{
	return $('<div/>').text(value).html();
};

html.decode = function(value)
{
	return $('<div/>').html(value).text();
};

// Given an html string, removes elements that match removal_selector from that
// string. Ex: remove_elements("userna<span class='ellipsis'>...</span>", "span.ellipsis")
// would return "userna"
html.remove_elements = function(html, removal_selector)
{
	var wrapped = $("<div>" + html + "</div>");
	wrapped.find(removal_selector).remove();
	return wrapped.html();
};

// Added Jquery functions
jQuery.fn.outer_html = function()
{
  return $('<div/>').append(this.eq(0).clone()).html();
};

jQuery.fn.select_text = function()
{
	var element = this[0];
	var range;
	var selection;

	if (document.body.createTextRange)
	{
			range = document.body.createTextRange();
			range.moveToElementText(element);
			range.select();
	} else if (window.getSelection)
	{
			selection = window.getSelection();
			range = document.createRange();
			range.selectNodeContents(element);
			selection.removeAllRanges();
			selection.addRange(range);
	}
};