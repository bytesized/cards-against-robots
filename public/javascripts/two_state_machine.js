// This 'class' is designed to implement a two state system
// Functions can be passed in to run when the state changes
// to 'active', or when the state changes to 'inactive'
// Also, the instance can be queried as to whether it is
// active or not
// Instances are initialized inactive

var two_state_machine = (function() {
	// Constructor
	function two_state_machine()
	{
		// Private variables
		this._active = false;
		this._activate_fns = [];
		this._deactivate_fns = [];
	};
	two_state_machine.prototype.on_activate = function(fn)
	{
		this._activate_fns.push(fn);
	};
	two_state_machine.prototype.on_deactivate = function(fn)
	{
		this._deactivate_fns.push(fn);
	};
	two_state_machine.prototype.is_active = function()
	{
		return this._active;
	};
	two_state_machine.prototype.activate = function()
	{
		this._active = true;
		for (var i = 0; i < this._activate_fns.length; i++)
			this._activate_fns[i]();
	};
	two_state_machine.prototype.deactivate = function()
	{
		for (var i = 0; i < this._deactivate_fns.length; i++)
			this._deactivate_fns[i]();
		this._active = false;
	};
	return two_state_machine;
})();
