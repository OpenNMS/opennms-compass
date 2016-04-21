(function() {
	'use strict';

	var angular = require('angular'),
		VersionCompare = require('version_compare');

	require('angular-debounce');

	require('./Rest');
	require('./util');

	require('../servers/Servers');

	var defaultInfo = {
		version: '0.0.0',
		numericVersion: 0.0,
		displayVersion: 'Unknown',
		packageName: 'opennms',
		packageDescription: 'OpenNMS Horizon',
		memory: 1000000000
	};

	angular.module('opennms.services.Info', [
		'ionic',
		'rt.debounce',
		'opennms.services.Rest',
		'opennms.services.Servers',
		'opennms.services.Util'
	])
	.value('info', angular.copy(defaultInfo))
	.factory('Info', function($q, $rootScope, $http, $injector, $log, $window, $timeout, debounce, RestService, Servers, util) {
		$log.info('Info: Initializing.');

		var current = $q.defer();

		var getMemory = function() {
			var deferred = $q.defer();
			if ($window && $window.chrome && $window.chrome.system && $window.chrome.system.memory) {
				$window.chrome.system.memory.getInfo(function(res) {
					deferred.resolve(res.capacity || defaultInfo.memory);
				});
			} else {
				deferred.resolve(defaultInfo.memory); // *shrug* you're on your own
			}
			return deferred.promise;
		};

		var doUpdate = function(data) {
			var existingPromise = current;
			current = $q.defer();

			data.numericVersion = parseFloat(data.version.replace('^(\\d+\\.\\d+).*$', '$1'));

			getMemory().then(function(memory) {
				var newInfo = $injector.get('info');
				var existingInfo = angular.copy(newInfo);

				angular.extend(newInfo, data);
				if (memory) {
					newInfo.memory = memory;
				}
				if (newInfo.packageDescription === 'OpenNMS' && newInfo.version !== '0.0.0') {
					newInfo.packageDescription = 'OpenNMS Horizon';
				}

				existingPromise.resolve(newInfo);
				current.resolve(newInfo);

				if (angular.equals(newInfo, existingInfo)) {
					$log.debug('Info.doUpdate(): update triggered but info has not changed.');
				} else {
					$log.debug('Info.doUpdate(): update triggered and info has changed: broadcasting.');
					$rootScope.$broadcast('opennms.info.updated', newInfo);
				}
			});
			return current.promise;
		};

		var updateInfo = debounce(500, function() {
			Servers.getDefault().then(function(server) {
				if (!server) {
					$log.debug('Info.updateInfo: skipping update, server is not configured yet.');
					return;
				}

				$log.info('Info.updateInfo: Initializing.');

				return RestService.get('/info', {limit:0}, {Accept: 'application/json'}).then(function(response) {
					if (angular.isString(response)) {
						response = angular.fromJson(response);
					}
					doUpdate(response);
					return response;
				});
			}).catch(function(err) {
				$log.warn('Info.updateInfo: failed: ' + angular.toJson(err));
				if (err.status === 404) {
					return doUpdate(angular.copy(defaultInfo));
				} else {
					return $q.reject(err);
				}
			});
		});

		util.onSettingsUpdated(updateInfo);
		util.onDefaultServerUpdated(updateInfo);
		util.onServersUpdated(updateInfo);
		$timeout(updateInfo);

		function validateVersion(version) {
			return VersionCompare.gte($injector.get('info').version, version);
		}
		function get() {
			return $injector.get('info');
		}
		function getInitialized() {
			return current.promise;
		}
		function isMeridian() {
			return get().packageName === 'meridian';
		}

		return {
			get: get,
			getInitialized: getInitialized,
			validateVersion: validateVersion,
			isMeridian: isMeridian
		};
	})
	;

}());
