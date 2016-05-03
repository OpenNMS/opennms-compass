(function() {
	'use strict';

	var angular = require('angular'),
		OnmsEvent = require('./models/OnmsEvent');

	var Constants = require('../misc/Constants');

	require('../misc/Rest');

	angular.module('opennms.services.Events', [
		'ionic',
		'opennms.services.Rest'
	])
	.factory('EventService', function($q, $log, RestService) {
		$log.info('EventService: Initializing.');

		var getEventsForNode = function(nodeId, limit) {
			var deferred = $q.defer();

			var params = {
				limit: limit||Constants.DEFAULT_REST_EVENT_LIMIT,
				'node.id': nodeId,
				orderBy: 'eventTime',
				order: 'desc'
			};

			RestService.getXml('/events', params).then(function(results) {
				/* jshint -W069 */ /* "better written in dot notation" */
				var ret = [];
				if (results && results.events && results.events.event) {
					var events = results.events.event;
					if (!angular.isArray(events)) {
						events = [events];
					}
					for (var i=0, len=events.length; i < len; i++) {
						ret.push(new OnmsEvent(events[i]));
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'EventService.getEventsForNode';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		return {
			node: getEventsForNode
		};
	});

}());
