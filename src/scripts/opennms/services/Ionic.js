(function() {
	'use strict';

	/* global cordova: true */
	/* global ionic: true */

	angular.module('opennms.services.Ionic', [
		'ionic',
		'ionic.service.core',
		'ionic.service.deploy',
		'ngCordova',
		'opennms.services.BuildConfig',
		'opennms.services.Settings',
	])
	.config(['$ionicAppProvider', 'config.build.ionicPublicKey', function($ionicAppProvider, ionicPublicKey) {
		if (ionicPublicKey) {
			console.log('Public key set.  Initializing.');
			$ionicAppProvider.identify({
				// The App ID (from apps.ionic.io) for the server
				app_id: 'bf988c24',
				// The public API key all services will use for this app
				api_key: ionicPublicKey
			});
		}
	}])
	.factory('IonicService', ['$q', '$ionicDeploy', '$ionicPopup', 'config.build.ionicPublicKey', function($q, $ionicDeploy, $ionicPopup, ionicPublicKey) {
		var rejected = $q.defer();
		rejected.reject(false);

		$ionicDeploy.setChannel('Dev');

		var checkForUpdates = function() {
			var deferred = $q.defer();

			if (!ionicPublicKey) {
				console.log('Ionic.checkForUpdates: skipping, no public key configured.');
				deferred.reject(false);
				return deferred.promise;
			}

			console.log('Ionic.checkForUpdates: checking for updates.');
			$ionicDeploy.check().then(function(hasUpdate) {
				console.log('Ionic.checkForUpdates: hasUpdate = ' + hasUpdate);
				deferred.resolve(hasUpdate);
			}, function(err) {
				console.log('Ionic.checkForUpdates: failed: ' + angular.toJson(err));
				deferred.reject(err);
			});

			return deferred.promise;
		};

		var promptForUpdates = function() {
			if (!ionicPublicKey) {
				console.log('Ionic.promptForUpdates: skipping, no public key configured.');
				return rejected.promise;
			}

			return checkForUpdates().then(function(hasUpdate) {
				if (hasUpdate) {
					return $ionicPopup.confirm({
						title: 'Update Compass?',
						template: 'OpenNMS Compass has an update. Install now?',
						cancelText: 'Not now.',
						cancelType: 'button-default',
						okType: 'button-compass',
					});
				} else {
					return false;
				}
			}, function(err) {
				console.log('Ionic.promptForUpdates: failed: ' + angular.toJson(err));
				return false;
			});
		};

		var doUpdate = function() {
			if (!ionicPublicKey) {
				console.log('Ionic.doUpdate: skipping, no public key configured.');
				return rejected.promise;
			}

			console.log('Ionic.doUpdate: updating app.');
			return $ionicDeploy.update().then(function(res) {
				console.log('Ionic.doUpdate: success! ' + angular.toJson(res));
				return true;
			}, function(err) {
				console.log('Ionic.doUpdate: failed: ' + angular.toJson(err));
				return false;
			}, function(progress) {
				console.log('Ionic.doUpdate: progress: ' + angular.toJson(progress));
			});
		};

		return {
			checkForUpdates: checkForUpdates,
			promptForUpdates: promptForUpdates,
			update: doUpdate,
		};
	}]);

}());
