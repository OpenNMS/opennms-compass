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

		const getEventsForNode = function(nodeId, limit) {
			const params = {
				limit: limit||Constants.DEFAULT_REST_EVENT_LIMIT,
				'node.id': nodeId,
				orderBy: 'eventTime',
				order: 'desc'
			};

			return RestService.getXml('/events', params).then(function(results) {
				if (results && results.event_asArray) {
					return results.event_asArray.map((ev) => new OnmsEvent(ev));
				}
				throw new Error('Invalid response.');
			}).catch(function(err) {
				err.caller = 'EventService.getEventsForNode';
				return $q.reject(err);
			});
		};

		return {
			node: getEventsForNode
		};
	});

}());
