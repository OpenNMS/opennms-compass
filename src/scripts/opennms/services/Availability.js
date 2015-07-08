(function() {
	'use strict';

	/* global ionic: true */
	/* global AvailabilityNode: true */
	/* global AvailabilitySection: true */

	angular.module('opennms.services.Availability', [
		'ionic',
		'opennms.services.Rest',
	])
	.factory('AvailabilityService', function($q, $rootScope, RestService, util) {
		console.log('AvailabilityService: Initializing.');

		var hasAvailability;

		var checkAvailability = function() {
			hasAvailability = $q.defer();
			console.log('AvailabilityService.checkAvailability: checking if availability service is valid.');
			RestService.get('/availability').then(function() {
				console.log('AvailabilityService.checkAvailability: availability service works!');
				hasAvailability.resolve(true);
			}, function() {
				console.log('AvailabilityService.checkAvailability: availability service does not work. :(');
				hasAvailability.resolve(false);
			});
		};

		var isSupported = function() {
			return hasAvailability.promise;
		};

		var getAvailability = function() {
			var deferred = $q.defer();

			hasAvailability.promise.then(function(canDo) {
				if (canDo) {
					RestService.getXml('/availability').then(function(results) {
						/* jshint -W069 */ /* "better written in dot notation" */
						var ret = [];

						if (results && results.availability && results.availability.section) {
							var sections = results.availability.section;
							if (!angular.isArray(sections)) {
								sections = [sections];
							}
							for (var i=0; i < sections.length; i++) {
								ret.push(new AvailabilitySection(sections[i]));
							}
						}

						deferred.resolve(ret);
					}, function(err) {
						err.caller = 'AvailabilityService.getAvailability';
						deferred.reject(err);
					});
				} else {
					deferred.resolve([]);
				}
			});

			return deferred.promise;
		};

		var getCategory = function(category) {
			var deferred = $q.defer();

			hasAvailability.promise.then(function(canDo) {
				if (canDo) {
					var url = '/availability/' + encodeURIComponent(category);
					RestService.getXml(url).then(function(results) {
						deferred.resolve(results);
					}, function(err) {
						err.caller = 'AvailabilityService.getCategory';
						deferred.reject(err);
					});
				} else {
					deferred.resolve([]);
				}
			});

			return deferred.promise;
		};

		var getNodes = function(category) {
			var deferred = $q.defer();

			hasAvailability.promise.then(function(canDo) {
				if (canDo) {
					var url = '/availability/' + encodeURIComponent(category) + '/nodes';
					RestService.getXml(url).then(function(results) {
						deferred.resolve(results);
					}, function(err) {
						err.caller = 'AvailabilityService.getNodes';
						deferred.reject(err);
					});
				} else {
					deferred.resolve([]);
				}
			});

			return deferred.promise;
		};

		var getNode = function(node) {
			var deferred = $q.defer();

			hasAvailability.promise.then(function(canDo) {
				if (canDo) {
					var nodeId = node;
					if (!angular.isNumber(node)) {
						nodeId = node.id;
					}
					var url = '/availability/nodes/' + nodeId;
					RestService.getXml(url).then(function(results) {
						if (results && results.node) {
							deferred.resolve(new AvailabilityNode(results.node));
						} else {
							deferred.resolve();
						}
					}, function(err) {
						err.caller = 'AvailabilityService.getNode';
						deferred.reject(err);
					});
				} else {
					deferred.resolve([]);
				}
			});

			return deferred.promise;
		};

		util.onSettingsUpdated(checkAvailability);
		checkAvailability();

		return {
			supported: isSupported,
			availability: getAvailability,
			category: getCategory,
			nodes: getNodes,
			node: getNode,
		};
	});

}());
