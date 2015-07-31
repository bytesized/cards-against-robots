// This file provides a mechanism for creating request queues and sending AJAX requests through them
// These queues are intended to limit simultaneous AJAX requests to 2 and to provide notifications
// for anything that needs to know if requests are in progress
// According to HTTP 1.1 specification, section 8.1.4:
// "A single-user client SHOULD NOT maintain more than 2 connections with any server"

ajax_request = (function()
{
	// Constructor
	function ajax_request()
	{
		// Private members
		this._request = null;
		this._url = null;
		this._data = {};
		this._deferred_fns = [];
	};

	// This function is a wrapper for its JQuery equivilant. However,
	// the call will be delayed until the request has actually been sent
	ajax_request.prototype.success = function(fn)
	{
		if (this._request === null)
		{
			// Request has not been sent yet, we need to defer it
			var deferred_fn = { type: 'success', fn: fn };
			this._deferred_fns.push(deferred_fn);
		} else {
			// Request has already been sent. Just pass this on to the actual request
			this._request.success(fn);
		}
	};

	// This function is a wrapper for its JQuery equivilant. However,
	// the call will be delayed until the request has actually been sent
	ajax_request.prototype.fail = function(fn)
	{
		if (this._request === null)
		{
			// Request has not been sent yet, we need to defer it
			var deferred_fn = { type: 'fail', fn: fn };
			this._deferred_fns.push(deferred_fn);
		} else {
			// Request has already been sent. Just pass this on to the actual request
			this._request.fail(fn);
		}
	};

	// This function is a wrapper for its JQuery equivilant. However,
	// the call will be delayed until the request has actually been sent
	ajax_request.prototype.always = function(fn)
	{
		if (this._request === null)
		{
			// Request has not been sent yet, we need to defer it
			var deferred_fn = { type: 'always', fn: fn };
			this._deferred_fns.push(deferred_fn);
		} else {
			// Request has already been sent. Just pass this on to the actual request
			this._request.always(fn);
		}
	};

	// Function to be called by the request sender when the request is sent
	// to notify the request that `this._request` is now a valid request
	ajax_request.prototype._was_sent = function()
	{
		while(this._deferred_fns.length > 0)
		{
			var deferred_fn = this._deferred_fns.shift();
			if (deferred_fn.type === 'success')
				this._request.success(deferred_fn.fn);
			else if (deferred_fn.type === 'fail')
				this._request.fail(deferred_fn.fn);
			else if (deferred_fn.type === 'always')
				this._request.always(deferred_fn.fn)
		}
	};

	return ajax_request;
})();

// Request queue object. Constructor takes optional argument specifying the number
// of simultaneous connections allowed. This value defaults to 2 if not specified
// Either a single queue allowing 2 simultaneous requests, or two queues allowing
// 1 simultaneous request should be created. 
ajax_request_queue = (function()
{
	// Constructor
	function ajax_request_queue(max_requests)
	{
		// Private members
		this._queue = [];
		this._current_requests = 0;
		if (max_requests)
			this._max_requests = max_requests;
		else
			this._max_requests = 2;
		this._on_send_fns = [];
		this._on_done_fns = [];
		this._sending = false;
	};

	// Creates a new request and puts it in the queue
	// Keep in mind that the data passed to this function may not be sent
	// immediately, and therefore should not be changed until a response
	// is received 
	ajax_request_queue.prototype.send = function(url, data)
	{
		var new_request = new ajax_request();
		new_request._url = url;
		new_request._data = data;

		this._queue.push(new_request);

		this._send_from_queue();
		return new_request;
	};

	// Starts sending a request out of the queue ONLY if we are not already
	// sending the maximum allowed number of requests
	ajax_request_queue.prototype._send_from_queue = function()
	{
		if (this._current_requests < this._max_requests)
		{
			++this._current_requests;
			var next_request = this._queue.shift();

			// We are now going to start sending. If we were not sending before
			// notify that we are starting
			if (!this._sending)
			{
				this._sending = true;
				for (var i = 0; i < this._on_send_fns.length; i++)
					this._on_send_fns[i]();
			}

			next_request._request = $.post(next_request._url, next_request._data, null, "json");
			next_request._request.always(this._on_request_finished.bind(this));
			next_request._was_sent();

			// We may not be at the maximum number of simultaneous
			// requests, so recurse until we are
			this._send_from_queue();
		}
	};

	ajax_request_queue.prototype._on_request_finished = function()
	{
		--this._current_requests;
		// If we are done sending, notify everyone of this
		if (this._current_requests === 0 && this._queue.length === 0)
		{
			this._sending = false;
			for (var i = 0; i < this._on_done_fns.length; i++)
				this._on_done_fns[i]();
		} else
		{
			this._send_from_queue();
		}
	};

	ajax_request_queue.prototype.is_sending = function()
	{
		return this._sending;
	};

	// Takes a function to run when sending begins. If we are already
	// sending, the function will be run immediately
	ajax_request_queue.prototype.on_send = function(fn)
	{
		this._on_send_fns.push(fn);
		if (this._sending)
			fn();
	};

	// Takes a function to run when sending ends. If we are already
	// done sending, the function will be run immediately
	ajax_request_queue.prototype.on_done = function(fn)
	{
		this._on_done_fns.push(fn);
		if (!this._sending)
			fn();
	};

	return ajax_request_queue;
})();
