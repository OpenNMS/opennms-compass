(function() {
	'use strict';

	var angular = require('angular'),
		VersionCompare = require('version_compare');

	require('angular-debounce');

	require('./Rest');
	require('./util');

	require('../servers/Servers');

	angular.module('opennms.services.Info', [
		'ionic',
		'rt.debounce',
		'opennms.services.Rest',
		'opennms.services.Servers',
		'opennms.services.Util'
	])
	.value('info', {
		version: '0.0.0',
		numericVersion: 0.0,
		displayVersion: 'Unknown',
		packageName: 'opennms',
		packageDescription: 'OpenNMS'
	})
	.factory('Info', function($q, $rootScope, $http, $injector, $log, $window, $timeout, debounce, RestService, Servers, util) {
		$log.info('Info: Initializing.');

		var onSuccess = function(data) {
			//$log.debug('info success=' + angular.toJson(data));
			data.numericVersion = parseFloat(data.version.replace('^(\\d+\\.\\d+).*$', '$1'));
			var info = $injector.get('info');
			angular.extend(info, data);
			$rootScope.$broadcast('opennms.info.updated', info);
			return data;
		};

		var updateInfo = debounce(500, function() {
			Servers.getDefault().then(function(server) {
				if (!server) {
					$log.debug('Info.updateInfo: skipping update, server is not configured yet.');
					return;
				}

				$log.info('Info.updateInfo: Initializing.');

				RestService.get('/info', {limit:0}, {Accept: 'application/json'}).then(function(response) {
					if (angular.isString(response)) {
						response = angular.fromJson(response);
					}
					onSuccess(response);
					return response;
				}, function(err) {
					$log.error('Info.updateInfo: failed: ' + angular.toJson(err));
					if (err.status === 404) {
						return onSuccess({
							version: '0.0.0'
						});
					} else {
						return $q.reject(err);
					}
				});
			});
		});

		util.onSettingsUpdated(updateInfo);
		util.onDefaultServerUpdated(updateInfo);
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
			}
		};
	})
	;

}());
