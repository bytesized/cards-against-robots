"use strict";
var fs = require('fs');
var path = require('path');

var filename = path.join(__dirname, 'words.json');

var words = JSON.parse(fs.readFileSync(filename));

// Enforce standardized capitalization
for (var word_type in words)
{
	if (words.hasOwnProperty(word_type))
	{
		for (var i = 0; i < words[word_type].length; i++)
			words[word_type][i] = words[word_type][i].charAt(0).toUpperCase() + words[word_type][i].slice(1).toLowerCase();
	}
}

// Enforce uniqueness
for (var word_type in words)
{
	if (words.hasOwnProperty(word_type))
	{
		words[word_type].sort().filter(function(item, pos, data)
		{
			return !pos || item != data[pos - 1];
		});
	}
}

module.exports = words;

