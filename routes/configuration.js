var express = require('express');
var router = express.Router();
var states = {
	unconfigured: 'unconfigured',
	configuring:  'configuring',
	configured:   'configured'
};
var state = states.unconfigured;
var config_options = {};

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('configure', {state: state, config: config_options});
});

module.exports = router;

