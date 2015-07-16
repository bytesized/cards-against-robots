"use strict";
// This module gets and sets object attributes based on string locations of the
// attributes. Example usage:
//     set(config = {}, 'mysql.host', 'localhost')
// Result:
//     config == { mysql: { host: 'localhost' } }


// Sets object attribute. See above example.
function set(object, attribute, value)
{
	// Resolve the data object specified
	// (Ex: if attribute == 'mysql.host', data_object = object.mysql)
	var tokens = attribute.split('.');
	attribute = tokens.pop();
	var data_object = object;
	while(tokens.length > 0)
	{
		var token = tokens.shift();
		if (!data_object[token])
			data_object[token] = {};
		data_object = data_object[token];
	}
	data_object[attribute] = value;
	return data_object;
}

// Gets the object attribute, for example,
//    data = { mysql: { host: 'localhost' } }
//    object_attribute.get(data, 'mysql.host')
// Returns 'localhost'
function get(object, attribute)
{
	var tokens = attribute.split('.');
	var data_value = object;
	while(tokens.length > 0)
		data_value = data_value[tokens.shift()];
	return data_value;
}

module.exports = {
	set : set,
	get : get
}