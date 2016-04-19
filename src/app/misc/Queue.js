'use strict';

var angular = require('angular');

var defaultInterval = 500;
var defaultMaxRequests = 4;

angular.module('opennms.misc.Queue', [])
.factory('Queue', function AngularQueue($interval, $log, $q, $rootScope) {
	var queues = [],
		interval = defaultInterval,
		started = null;

	function printQueueStats(queue, force) {
		if (!__DEVELOPMENT__) { return; }
		var req = queue.requests.length;
		if (!force && queue.inFlight === 0 && req === 0) {
			return;
		}
		$log.debug('Queue.'+queue.name+': ' + queue.inFlight + ' in-flight, ' + req + ' pending');
	}

	function printQueuesStats(force) {
		if (!__DEVELOPMENT__) { return; }
		for (var i=0, len=queues.length; i < len; i++) {
			printQueueStats(queues[i], force);
		}
	}

	function execute(request) {
		//$log.info('HTTP.execute: request=' + angular.toJson(request));
		request.queue.inFlight++;
		return $q.when(request.callback()).then(function(res) {
			request.deferred.resolve(res);
			return request.deferred.promise;
		}).catch(function(err) {
			request.deferred.reject(err);
			return request.deferred.promise;
		}).finally(function() {
			request.queue.inFlight--;
			printQueueStats(request.queue, true);
		});
	}

	function processQueues() {
		printQueuesStats();
		for (var i=0, len=queues.length, queue; i < len; i++) {
			queue = queues[i];
			while (queue.requests.length > 0 && queue.inFlight < queue.maxRequests) {
				execute(queue.requests.shift());
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
		this.requests = [];
		this.inFlight = 0;
		this.maxRequests = this.options.maxRequests || defaultMaxRequests;
	}
	Queue.prototype.add = function addToQueue(callback) {
		var self = this,
			deferred = $q.defer();
		self.requests.push({
			queue: self,
			deferred: deferred,
			callback: callback
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
