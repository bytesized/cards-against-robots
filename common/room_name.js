"use strict";
// Generates unique room names using an adjective and a noun
var path = require('path');
var words = require(path.join(__dirname, 'words'));

var total_room_count = words.adjectives.length * words.nouns.length;
var available_room_count = total_room_count;

// Make an array to keep track of how many rooms are available for each adjective
var available_room_count_by_adjective = [];
for (var i = 0; i < words.adjectives.length; i++)
	available_room_count_by_adjective[i] = words.nouns.length;

// Make an array of arrays indicating for each adjective which noun indicies are taken as rooms
// The noun indicies will remain sorted
var nouns_taken_by_adjective = [];
for (var i = 0; i < words.adjectives.length; i++)
{
	nouns_taken_by_adjective[i] = [];
	for (var j = 0; j < words.nouns.length; j++) {
		nouns_taken_by_adjective[i][j] = false;
	};
}

// Gets a room name and marks it as being used. The room name will not be available for use again until 
// it is released
// Throws an error if there are no more room names available
var get_name = function()
{
	if (available_room_count === 0)
		throw new Error('Out of available rooms!');

	// This will be the 0-based index of which name to use 0 means the first adjective, first noun
	var name_index = Math.floor(Math.random() * available_room_count);
	// Find the adjective that this name_index corresponds to
	var adjective_index = 0;
	// While the number of names left before the chosen name (`name_index`) is greater than the
	// number of names left for this adjective:
	// - decrement `name_index` by the number of names we will skip by skipping this adjective
	// - go to the next adjective
	while (name_index >= available_room_count_by_adjective[adjective_index])
	{
		name_index -= available_room_count_by_adjective[adjective_index];
		++adjective_index;
	}
	// Now we have the adjective we want, get the noun.
	// Since we are not counting used nouns (for this adjective), add 1 to name_index for
	// each index of a used noun that is less than name_index
	var noun_index = name_index;
	for (var i = 0; i < nouns_taken_by_adjective[adjective_index].length; i++)
	{
		if (i > noun_index)
			break;
		if (nouns_taken_by_adjective[adjective_index][i])
			++noun_index;
	}

	// Mark this combination as used
	--available_room_count;
	--available_room_count_by_adjective[adjective_index];
	nouns_taken_by_adjective[adjective_index][noun_index] = true;

	return words.adjectives[adjective_index] + words.nouns[noun_index];
};

// Releases the room name given and returns it to the pool of usable rooms
// If this room name is already free, nothing happens
var release_name = function(to_release)
{
	var match_result = to_release.match(/^([A-Z][a-z]*)([A-Z][a-z]*)$/);
	if (match_result === null)
		throw new Error('Name to be released does not follow room name format');
	var adjective_string = match_result[1];
	var noun_string = match_result[2];

	var adjective_index = words.adjectives.indexOf(adjective_string);
	if (adjective_index === -1)
		throw new Error('Unrecognized adjective found when releasing room: ' + adjective_string);
	var noun_index = words.nouns.indexOf(noun_string);
	if (noun_index === -1)
		throw new Error('Unrecognized noun found when releasing room: ' + noun_string);

	if (nouns_taken_by_adjective[adjective_index][noun_index])
	{
		++available_room_count;
		++available_room_count_by_adjective[adjective_index];
		nouns_taken_by_adjective[adjective_index][noun_index] = false;
	}
};

module.exports = {
	get     : get_name,
	release : release_name
};
