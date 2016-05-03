(function() {
	'use strict';

	var angular = require('angular');

	require('../../../generated/misc/BuildConfig');

	angular.module('opennms.services.Ionic', [
		'ionic',
		'ionic.service.core',
		'ionic.service.deploy',
		'ngCordova',
		'opennms.services.BuildConfig'
	])
	.config(['$ionicAppProvider', 'config.build.ionicPublicKey', function($log, $ionicAppProvider, ionicPublicKey) {
		if (ionicPublicKey) {
			$log.info('Public key set.  Initializing.');
			$ionicAppProvider.identify({
				// The App ID (from apps.ionic.io) for the server
				app_id: 'bf988c24',
				// The public API key all services will use for this app
				api_key: ionicPublicKey
			});
		}
	}])
	.factory('IonicService', ['$q', '$log', '$ionicDeploy', '$ionicPopup', 'config.build.ionicPublicKey', function($q, $log, $ionicDeploy, $ionicPopup, ionicPublicKey) {
		var rejected = $q.defer();
		rejected.reject(false);

		$ionicDeploy.setChannel('Dev');

		var checkForUpdates = function() {
			var deferred = $q.defer();

			if (!ionicPublicKey) {
				$log.info('Ionic.checkForUpdates: skipping, no public key configured.');
				deferred.reject(false);
				return deferred.promise;
			}

			$log.info('Ionic.checkForUpdates: checking for updates.');
			$ionicDeploy.check().then(function(hasUpdate) {
				$log.debug('Ionic.checkForUpdates: hasUpdate = ' + hasUpdate);
				deferred.resolve(hasUpdate);
			}, function(err) {
				$log.error('Ionic.checkForUpdates: failed: ' + angular.toJson(err));
				deferred.reject(err);
			});

			return deferred.promise;
		};

		var promptForUpdates = function() {
			if (!ionicPublicKey) {
				$log.info('Ionic.promptForUpdates: skipping, no public key configured.');
				return rejected.promise;
			}

			return checkForUpdates().then(function(hasUpdate) {
				if (hasUpdate) {
					return $ionicPopup.confirm({
						title: 'Update Compass?',
						template: 'OpenNMS Compass has an update. Install now?',
						cancelText: 'Not now.',
						cancelType: 'button-default',
						okType: 'button-compass'
					});
				}

				return false;
			}).catch(function(err) {
				$log.error('Ionic.promptForUpdates: failed: ' + angular.toJson(err));
				return false;
			});
		};

		var doUpdate = function() {
			if (!ionicPublicKey) {
				$log.debug('Ionic.doUpdate: skipping, no public key configured.');
				return rejected.promise;
			}

			$log.info('Ionic.doUpdate: updating app.');
			return $ionicDeploy.update().then(function(res) {
				$log.debug('Ionic.doUpdate: success! ' + angular.toJson(res));
				return true;
			}, function(err) {
				$log.info('Ionic.doUpdate: failed: ' + angular.toJson(err));
				return false;
			}, function(progress) {
				$log.debug('Ionic.doUpdate: progress: ' + angular.toJson(progress));
			});
		};

		return {
			checkForUpdates: checkForUpdates,
			promptForUpdates: promptForUpdates,
			update: doUpdate
		};
	}]);

}());
