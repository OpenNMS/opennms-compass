'use strict';

var angular = require('angular');

var DEFAULT_IDLE_INTERVAL = 1000;
var DEFAULT_MAX_REQUESTS = 4;
var DEFAULT_TIMEOUT = 20000;

angular.module('opennms.misc.Queue', [])
.factory('Queue', function AngularQueue($interval, $log, $q, $rootScope, $timeout) {
	var queues = [],
		interval = DEFAULT_IDLE_INTERVAL,
		started = null;

	function printQueueStats(queue, force) {
		if (!__DEVELOPMENT__) { return; }
		var pendinglen = queue.pending.length,
			flightlen = queue.inFlight.length;
		if (!force && pendinglen === 0 && flightlen === 0) { // eslint-disable-line no-magic-numbers
			return;
		}
		$log.debug('Queue.'+queue.name+': ' + flightlen + ' in-flight, ' + pendinglen + ' pending');
	}

	function printQueuesStats(force) {
		if (!__DEVELOPMENT__) { return; }
		for (var i=0, len=queues.length; i < len; i++) {
			printQueueStats(queues[i], force);
		}
	}

	var checkTimeouts = {};
	function scheduleCheck(queue) {
		if (checkTimeouts[queue.name]) {
			$timeout.cancel(checkTimeouts[queue.name]);
		}
		checkTimeouts[queue.name] = $timeout(function() {
			processQueue(queue);
		});
	}

	function execute(request) {
		//$log.info('HTTP.execute: request=' + angular.toJson(request));
		request.started = Date.now();
		/*
		if (__DEVELOPMENT__) {
			$log.debug('Queue.' + request.queue.name + ': executing, latency=' + (request.started - request.added) + 'ms.');
		}
		*/
		request.queue.inFlight.push(request);
		return $q.when(request.callback()).then(function(res) {
			request.deferred.resolve(res);
			return request.deferred.promise;
		}).catch(function(err) {
			request.deferred.reject(err);
			return request.deferred.promise;
		}).finally(function() {
			request.queue.inFlight.remove(request);
			if (request.queue.inFlight.length === 0) { // eslint-disable-line no-magic-numbers
				printQueueStats(request.queue, true);
			}
			scheduleCheck(request.queue);
		});
	}

	function getInFlight(request) {
		return request.queue.inFlight.filter(function(inf) {
			return inf.name === request.name;
		});
	}

	/* eslint-disable no-magic-numbers */
	function getNextRequest(queue) {
		var len = queue.pending.length;
		/*
		if (__DEVELOPMENT__) {
			$log.debug('getNextRequest(' + queue.name + '), len=' + len);
		}
		*/
		if (len === 0) {
			return null;
		}
		for (var i=0, request, existing; i < len; i++) {
			request = queue.pending[i];

			// if this is a named request, check if there is already one by the same name in-flight
			// if so, skip it and look for another ready request
			if (request.name) {
				existing = getInFlight(request);
				/*
				if (__DEVELOPMENT__) {
					$log.debug('getNextRequest(' + queue.name + '): request=' + request.name + ', existing=' + existing.length);
				}
				*/
				if (existing.length > 0) {
					continue;
				}
			}

			queue.pending.splice(i, 1);
			return request;
		}
		return null;
	}
	/* eslint-enable no-magic-numbers */

	function processQueue(queue) {
		var threshold = Date.now() - queue.timeout;
		for (var f=queue.inFlight.length - 1, inFlight; f >= 0; f--) { // eslint-disable-line no-magic-numbers
			inFlight = queue.inFlight[f];
			if (inFlight && inFlight.started < threshold) {
				$log.warn('request timed out; this should not happen' + (inFlight.name? ': ' + inFlight.name : ''));
				inFlight.deferred.reject('timed out');
				queue.inFlight.remove(inFlight);
			}
		}

		var nextRequest = null;
		do {
			if (queue.inFlight.length >= queue.maxRequests) {
				/*
				if (__DEVELOPMENT__) {
					$log.debug('Queue.' + queue.name + ': ' + queue.inFlight.length + ' in-flight requests hit the maximum request threshold (' + queue.maxRequests + ')');
				}
				*/
				break;
			}

			nextRequest = getNextRequest(queue);
			/*
			if (__DEVELOPMENT__) {
				$log.debug('Queue.' + queue.name + ': next request=' + (nextRequest? nextRequest.name : 'null' ));
			}
			*/
			if (nextRequest === null) {
				if (queue.pending.length > 0) { // eslint-disable-line no-magic-numbers
					$log.debug('Queue.' + queue.name + ': skipping ' + queue.pending.length + ' requests because they have previous requests already in-flight.');
				}
				break;
			}
			execute(nextRequest);
		} while (nextRequest !== null);
		printQueueStats(queue);
	}

	function processQueues() {
		for (var i=0, len=queues.length; i < len; i++) {
			processQueue(queues[i]);
		}
		printQueuesStats();
	}

	var lastCheck = Date.now();
	function checkQueues() {
		if (started !== null) {
			var now = Date.now();
			if (now - lastCheck < interval) {
				return;
			}
			lastCheck = now;
			processQueues();
		}
	}

	function start(i) {
		if (started) {
			$interval.cancel(started);
		}
		started = $interval(checkQueues, i || interval);
	}
	function stop() {
		if (started) {
			$interval.cancel(started);
		}
		started = null;
	}
	function create(options) {
		var q = new Queue(options);
		queues.push(q);
		return q;
	}
	function get(name) {
		return queues.filter(function(queue) {
			return queue.name === name;
		})[0];
	}

	function Queue(options) {
		this.options = angular.copy(options || {});
		this.name = options.name || Date.now();
		this.pending = [];
		this.inFlight = [];
		this.maxRequests = this.options.maxRequests || DEFAULT_MAX_REQUESTS;
		this.timeout = this.options.timeout || DEFAULT_TIMEOUT;
	}
	Queue.prototype.add = function addToQueue(callback, name) {
		var self = this,
			deferred = $q.defer();
		self.pending.push({
			queue: self,
			name: name,
			deferred: deferred,
			callback: callback,
			added: Date.now()
		});
		return deferred.promise;
	};
	Queue.prototype.cancel = function(name) {
		var ret = [];

		var self = this;

		for (var i=0, len = self.pending.length, pending; i < len; i++) {
			pending = self.pending[i];
			if (pending && pending.name !== undefined && pending.name === name) {
				ret.push(self.pending.splice(i, 1)[0]); // eslint-disable-line no-magic-numbers
			}
		}
		for (var j=0, retlen = ret.length; j < retlen; j++) {
			self.pending.remove(ret[j]);
		}

		if (__DEVELOPMENT__) {
			if (ret.length > 0) { // eslint-disable-line no-magic-numbers
				$log.debug('Queue.' + this.name + ': removed: ' + ret.map(function(pending) {
					if (pending) {
						return pending.name;
					}

					return 'unknown';
				}));
			}
		}
		return ret;
	};
	Queue.prototype.clear = function clear() {
		var len = this.pending.length;
		if (len > 0) { // eslint-disable-line no-magic-numbers
			$log.debug('Queue.' + this.name + ': clearing ' + len + ' entries.');
			this.pending = [];
		}
	};

	start();

	$rootScope.$watch(function() {
		checkQueues();
		return true;
	});

	return {
		setInterval: function setInterval(i) {
			var int = parseInt(i, 10);
			if (isNaN(int)) {
				$log.warn('setInterval(' + i + ') is not valid!');
			}
			interval = int;
			if (started) {
				stop();
				start();
			}
		},
		create: create,
		get: get,
		start: start,
		stop: stop
	};
});
