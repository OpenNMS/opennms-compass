'use strict';

var angular = require('angular');

var defaultInterval = 500;
var defaultMaxRequests = 4;
var defaultTimeout = 20000;

angular.module('opennms.misc.Queue', [])
.factory('Queue', function AngularQueue($interval, $log, $q, $rootScope) {
	var queues = [],
		interval = defaultInterval,
		started = null;

	function printQueueStats(queue, force) {
		if (!__DEVELOPMENT__) { return; }
		var pendinglen = queue.pending.length,
			flightlen = queue.inFlight.length;
		if (!force && pendinglen === 0 && flightlen === 0) {
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

	function execute(request) {
		//$log.info('HTTP.execute: request=' + angular.toJson(request));
		request.started = Date.now();
		$log.debug('Queue.' + request.queue.name + ': executing, latency=' + (request.started - request.added) + 'ms.');
		request.queue.inFlight.push(request);
		return $q.when(request.callback()).then(function(res) {
			request.deferred.resolve(res);
			return request.deferred.promise;
		}).catch(function(err) {
			request.deferred.reject(err);
			return request.deferred.promise;
		}).finally(function() {
			request.queue.inFlight.remove(request);
			printQueueStats(request.queue, true);
		});
	}

	function processQueues() {
		printQueuesStats();
		for (var i=0, len=queues.length, queue; i < len; i++) {
			queue = queues[i];
			var threshold = Date.now() - queue.timeout;
			for (var f=queue.inFlight.length - 1, inFlight; f >= 0; f--) {
				inFlight = queue.inFlight[f];
				if (inFlight && inFlight.started < threshold) {
					$log.warn('request timed out; this should not happen');
					inFlight.deferred.reject('timed out');
					delete queue.inFlight[f];
				}
			}
			while (queue.pending.length > 0 && queue.inFlight.length < queue.maxRequests) {
				var request = queue.pending.shift();
				execute(request);
			}
		}
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

	function Queue(options) {
		this.options = angular.copy(options || {});
		this.name = options.name || Date.now();
		this.pending = [];
		this.inFlight = [];
		this.maxRequests = this.options.maxRequests || defaultMaxRequests;
		this.timeout = this.options.timeout || defaultTimeout;
	}
	Queue.prototype.add = function addToQueue(callback) {
		var self = this,
			deferred = $q.defer();
		self.pending.push({
			queue: self,
			deferred: deferred,
			callback: callback,
			added: Date.now()
		});
		return deferred.promise;
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
		},
		create: create,
		start: start,
		stop: stop
	};
});
