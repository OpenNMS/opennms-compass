(function() {
	'use strict';

	/* global ionic: true */
	/* global VersionCompare: true */

	angular.module('opennms.services.Info', [
		'ionic',
		'opennms.services.Rest',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util',
	])
	.value('info', {
		version: '0.0.0',
		numericVersion: 0.0,
		displayVersion: 'Unknown',
		packageName: 'opennms',
		packageDescription: 'OpenNMS'
	})
	.factory('Info', function($q, $rootScope, $http, $injector, $window, $timeout, RestService, Servers, Settings, util) {
		console.log('Info: Initializing.');

		var onSuccess = function(data) {
			//console.log('info success=' + angular.toJson(data));
			data.numericVersion = parseFloat(data.version.replace('^(\\d+\\.\\d+).*$', '$1'));
			var info = $injector.get('info');
			angular.extend(info, data);
			$rootScope.$broadcast('opennms.info.updated', info);
		};

		var updateInfo = function() {
			Servers.getDefault().then(function(server) {
				if (!server) {
					console.log('Info.updateInfo: skipping update, server is not configured yet.');
					return;
				}

				console.log('Info.updateInfo: Initializing.');

				RestService.get('/info', {'limit':0}, {'Accept': 'application/json'}).then(function(response) {
					if (angular.isString(response)) {
						response = angular.fromJson(response);
					}
					onSuccess(response);
					return response;
				}, function(err) {
					console.log('Info.updateInfo: failed: ' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		util.onSettingsUpdated(updateInfo);
		util.onServersUpdated(updateInfo);
		$timeout(updateInfo);

		return {
			get: function() {
				return $injector.get('info');
			},
			validateVersion: function(version) {
				return VersionCompare.gte($injector.get('info').version, version);
			},
			isMeridian: function() {
				return $injector.get('info').packageName === 'meridian';
			},
		};
	})
	;

}());
