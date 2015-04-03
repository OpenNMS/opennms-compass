(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Info', [
		'ionic',
		'opennms.services.Rest',
		'opennms.services.Settings'
	])
	.factory('Info', function($q, $rootScope, $http, $timeout, RestService, Settings) {
		console.log('Info: Initializing.');

		var defaultInfo = {
			version: '0.0.0',
			numericVersion: 0.0,
			displayVersion: 'Unknown',
			packageName: 'opennms',
			packageDescription: 'OpenNMS'
		};

		var initialized = false;
		var currentInfo = angular.copy(defaultInfo);
		var info = $q.defer();

		var updateInfo = function() {
			if (!Settings.isServerConfigured()) {
				console.log('Info.updateInfo: skipping update, server is not configured yet.');
				return;
			}

			if (initialized) {
				console.log('updateInfo: replacing promise');
				info.resolve(currentInfo);
				info = $q.defer();
			}

			$http.get(RestService.url('/info'), {
				headers: {
					'Accept': 'application/json'
				},
				withCredentials: true,
			}).success(function(results) {
				results.numericVersion = parseFloat(results.version.replace('^(\\d+\\.\\d+).*$', '$1'));
				currentInfo = angular.copy(results);
				info.resolve(currentInfo);
				initialized = true;
			}).error(function(data, status, headers, config, statusText) {
				console.log('Info.updateInfo failed: ' + status + ' ' + statusText, data);
				currentInfo = angular.copy(defaultInfo);
				info.resolve(currentInfo);
				initialized = true;
			});
		};
		$timeout(updateInfo);

		$rootScope.$on('opennms.settings.changed', function() {
			updateInfo();
		});

		return {
			get: function() {
				return info.promise;
			}
		};
	});

}());
