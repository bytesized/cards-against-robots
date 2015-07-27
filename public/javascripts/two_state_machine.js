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
	// Pass a function to be called when entering the active state
	// If state machine is currently in the active state, the function
	// will be called immediately
	two_state_machine.prototype.on_activate = function(fn)
	{
		this._activate_fns.push(fn);
		if (this._active)
			fn();
	};
	// Pass a function to be called when leaving the active state
	// If state machine is currently in the inactive state, the function
	// will be called immediately
	two_state_machine.prototype.on_deactivate = function(fn)
	{
		this._deactivate_fns.push(fn);
		if (!this._active)
			fn();
	};
	two_state_machine.prototype.is_active = function()
	{
		return this._active;
	};
	// Transition to active state
	two_state_machine.prototype.activate = function()
	{
		if (!this._active)
		{
			this._active = true;
			for (var i = 0; i < this._activate_fns.length; i++)
				this._activate_fns[i]();
		}
	};
	// Transition to inactive state
	two_state_machine.prototype.deactivate = function()
	{
		if (this._active)
		{
			this._active = false;
			for (var i = 0; i < this._deactivate_fns.length; i++)
				this._deactivate_fns[i]();
		}
	};
	return two_state_machine;
})();
