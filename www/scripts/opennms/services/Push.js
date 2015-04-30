(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Push', [
		'ionic',
		'ionic.service.core',
		'ionic.service.push',
		'opennms.services.BuildConfig',
		'opennms.services.Settings',
	])
	/*
	.config(['config.build.ionicAppId', 'config.build.ionicPushPublicKey', 'config.build.ionicGcmId', '$ionicAppProvider', function(appId, publicKey, gcmId, $ionicAppProvider) {
		console.log('app ID:' + appId);
		console.log('public key: ' + publicKey);
		console.log('GCM ID: ' + gcmId);
		console.log('App provider:',$ionicAppProvider);
		$ionicAppProvider.identify({
			'app_id': appId,
			'api_key': publicKey,
			'gcm_id': gcmId
		}).then(function() {
			console.log('Push.config: identified app.');
		}, function(err) {
			console.log('Push.config: Failed to identify app: ' + angular.toJson(err));
		});
	}])
	*/
	.factory('Push', function($rootScope, $ionicPush, $ionicUser, Settings) {
		console.log('Push: Initializing.');

		var $scope = $rootScope.$new();

		/*
		var user = $ionicUser.get();
		if (!user.user_id) {
			user.user_id = $ionicUser.generateGUID();
		}
		angular.extend(user, {
			server: Settings.URL(),
			username: Settings.username()
		});
		$ionicUser.identify(user).then(function() {
			$ionicPush.register({
				canShowAlert: false,
				onNotification: function(notification) {
					console.log('Push.init: received notification: ' + angular.toJson(notification));
				}
			}).then(function(token) {
				$scope.token = token;
				console.log('Push.init: got device token: ' + angular.toJson(token));
			});
		}, function(err) {
			console.log('Push.init: Failed to identify user: ' + angular.toJson(err));
		});
		*/

		return {
		};
	});

}());
