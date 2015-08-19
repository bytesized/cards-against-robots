"use strict";
var path = require('path');

// Returns a shuffled copy of the given array
var shuffle = function(array)
{
	var shuffled = [];
	// Shallow Copy array
	var array_copy = array.slice();
	for (var cards_left = array_copy.length; cards_left > 0; --cards_left)
	{
		var rand_index = Math.floor(Math.random() * cards_left);
		// Remove card with `splice`. `splice` returns an array containing
		// the next card to add
		var next_card = array_copy.splice(rand_index, 1)[0];
		shuffled.push(next_card);
	}
	return shuffled;
};

// Randomly picks one element of the array
// Returns null if there are no items in the array
var pick_one = function(array)
{
	if (array.length === 0)
		return null;

	var rand_index = Math.floor(Math.random() * array.length);
	return array.splice(rand_index, 1)[0];
};

module.exports = {
	shuffle  : shuffle,
	pick_one : pick_one
};