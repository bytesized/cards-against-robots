"use strict";
// This module provides functionality related to HTML
var path = require('path');

var encode = function(str)
{
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

module.exports = {
	encode : encode
}