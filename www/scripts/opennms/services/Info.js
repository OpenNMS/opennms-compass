(function() {
	'use strict';

	/* global ionic: true */
	/* global VersionCompare: true */

	angular.module('opennms.services.Info', [
		'ionic',
		'opennms.services.Rest',
		'opennms.services.Settings'
	])
	.factory('Info', function($q, $rootScope, $http, $window, $timeout, RestService, Settings) {
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

		var onSuccess = function(data) {
			console.log('info success=' + angular.toJson(data));
			data.numericVersion = parseFloat(data.version.replace('^(\\d+\\.\\d+).*$', '$1'));
			currentInfo = angular.copy(data);
			info.resolve(currentInfo);
			initialized = true;
		};

		var onFailure = function() {
			currentInfo = angular.copy(defaultInfo);
			info.resolve(currentInfo);
			initialized = true;
		};

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

			RestService.get('/info', {'limit':0}, {'Accept': 'application/json'}).then(function(response) {
				if (angular.isString(response)) {
					response = angular.fromJson(response);
				}
				onSuccess(response);
			}, function(err) {
				console.log('Info.updateInfo failed: ' + angular.toJson(err));
				onFailure();
			});
		};
		$timeout(updateInfo);

		$rootScope.$on('opennms.settings.changed', function() {
			updateInfo();
		});

		return {
			get: function() {
				return info.promise;
			},
			validateVersion: function(version) {
				return info.promise.then(function(info) {
					return VersionCompare.gte(info.version, version);
				});
			},
		};
	});

}());
