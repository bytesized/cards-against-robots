var fs = require('fs');
var path = require('path');
var config_object;
var is_configured;
var filename = path.join(__dirname, 'configuration.json');

// Load configuration if it exists
try
{
	var config_str = fs.readFileSync(filename);
	config_object = JSON.parse(config_str);
	is_configured = true;
} catch (error)
{
	if (error.code === 'ENOENT') // File not found -> No existing configuration
	{
		config_object = null;
		is_configured = false;
	} else
	{
		throw error;
	}
}

module.exports = {
	is_configured : is_configured,
	filename      : filename,
	config_object : config_object
};

