var fs = require('fs');
var config_object;
var is_configured;

// Load configuration if it exists
try
{
	var config_str = fs.readFileSync('configuration.json');
	config_object = JSON.parse(config_str);
	is_configured = true;
} catch (e)
{
	if (e.code === 'ENOENT') // File not found -> No existing configuration
	{
		config_object = null;
		is_configured = false;
	} else
	{
		throw e;
	}
}

module.exports = {
	is_configured: is_configured,
	config_object: config_object
};

