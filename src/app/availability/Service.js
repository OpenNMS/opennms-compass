(function() {
	'use strict';

	var angular = require('angular'),
		AvailabilityNode = require('./models/AvailabilityNode'),
		AvailabilitySection = require('./models/AvailabilitySection');

	require('angular-debounce');

	require('../misc/Rest');
	require('../misc/util');

	var CHECK_AVAILABILITY_DELAY = 300;

	angular.module('opennms.services.Availability', [
		'ionic',
		'rt.debounce',
		'opennms.services.Rest',
		'opennms.services.Util'
	])
	.factory('AvailabilityService', function($log, $q, $rootScope, debounce, RestService, util) {
		$log.info('AvailabilityService: Initializing.');

		var hasAvailability;

		var checkAvailability = debounce(CHECK_AVAILABILITY_DELAY, function() {
			var oldAvailability = hasAvailability;
			var newAvailability = $q.defer();

			var done = function(value) {
				if (oldAvailability) {
					oldAvailability.resolve(value);
				}
				newAvailability.resolve(value);
			};

			hasAvailability = newAvailability;
			$log.debug('AvailabilityService.checkAvailability: checking if availability service is valid.');
			RestService.head('/availability', {limit:1}).then(function() {
				$log.info('AvailabilityService.checkAvailability: availability service works!');
				done(true);
			}).catch(function() {
				$log.info('AvailabilityService.checkAvailability: availability service does not work. :(');
				done(false);
			});
		});

		var isSupported = function() {
			return hasAvailability.promise;
		};

		var getAvailability = function() {
			return isSupported().then(function(canDo) {
				if (!canDo) {
					return [];
				}

				return RestService.getXml('/availability').then(function(results) {
					if (results && results.section_asArray) {
						return results.section_asArray.map((section) => new AvailabilitySection(section));
					}
					return ret;
				});
			}).catch(function(err) {
				err.caller = 'AvailabilityService.getAvailability';
				return $q.reject(err);
			});
		};

		var getCategory = function(category) {
			return isSupported().then(function(canDo) {
				if (!canDo) {
					return [];
				}

				var url = '/availability/' + encodeURIComponent(category);
				return RestService.getXml(url);
			}).catch(function(err) {
				err.caller = 'AvailabilityService.getCategory';
				return $q.reject(err);
			});
		};

		var getNodes = function(category) {
			return isSupported().then(function(canDo) {
				if (!canDo) {
					return [];
				}

				var url = '/availability/' + encodeURIComponent(category) + '/nodes';
				return RestService.getXml(url);
			}).catch(function(err) {
				err.caller = 'AvailabilityService.getNodes';
				return $q.reject(err);
			});
		};

		var getNode = function(node) {
			return isSupported().then(function(canDo) {
				if (!canDo) {
					return undefined;
				}

				var nodeId = node;
				if (!angular.isNumber(node)) {
					nodeId = node.id;
				}
				var url = '/availability/nodes/' + nodeId;
				return RestService.getXml(url).then(function(results) {
					if (results && results.id) {
						return new AvailabilityNode(results);
					}

					return undefined;
				});
			}).catch(function(err) {
				err.caller = 'AvailabilityService.getNode';
				return $q.reject(err);
			});
		};

		util.onSettingsUpdated(checkAvailability);
		util.onServersUpdated(checkAvailability);
		util.onTimeoutUpdated(checkAvailability);
		checkAvailability();

		return {
			supported: isSupported,
			availability: getAvailability,
			category: getCategory,
			nodes: getNodes,
			node: getNode
		};
	});

}());
