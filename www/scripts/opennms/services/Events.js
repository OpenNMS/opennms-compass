(function() {
	'use strict';

	/* global ionic: true */
	/* global Event: true */

	angular.module('opennms.services.Events', [
		'ionic',
		'opennms.services.Rest'
	])
	.factory('EventService', ['$q', 'RestService', function($q, RestService) {
		console.log('EventService: Initializing.');

		var getEventsForNode = function(nodeId, limit) {
			var deferred = $q.defer();

			var params = {
				'limit': limit||10,
				'node.id': nodeId,
				'orderBy': 'eventTime',
				'order': 'desc',
			};

			RestService.getXml('/events', params).then(function(results) {
				/* jshint -W069 */ /* "better written in dot notation" */
				var ret = [];
				if (results && results.events && results.events.event) {
					var events = results.events.event;
					if (!angular.isArray(events)) {
						events = [events];
					}
					for (var i=0; i < events.length; i++) {
						ret.push(new Event(events[i]));
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
			node: getEventsForNode,
		};
	}]);

}());
