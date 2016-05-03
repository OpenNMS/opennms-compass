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
			RestService.head('/availability').then(function() {
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
					/* jshint -W069 */ /* "better written in dot notation" */
					var ret = [];

					if (results && results.availability && results.availability.section) {
						var sections = results.availability.section;
						if (!angular.isArray(sections)) {
							sections = [sections];
						}
						for (var i=0, len=sections.length; i < len; i++) {
							ret.push(new AvailabilitySection(sections[i]));
						}
					}

					return ret;
				});
			}, function(err) {
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
			}, function(err) {
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
			}, function(err) {
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
					if (results && results.node) {
						return new AvailabilityNode(results.node);
					}

					return undefined;
				});
			}, function(err) {
				err.caller = 'AvailabilityService.getNode';
				return $q.reject(err);
			});
		};

		util.onSettingsUpdated(checkAvailability);
		util.onServersUpdated(checkAvailability);
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
