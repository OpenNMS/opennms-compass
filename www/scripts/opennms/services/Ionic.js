(function() {
	'use strict';

	/* global cordova: true */
	/* global ionic: true */

	angular.module('opennms.services.Ionic', [
		'ionic',
		'ionic.service.core',
		'ionic.service.push',
		'ngCordova',
		'opennms.services.BuildConfig',
		'opennms.services.Config',
		'opennms.services.Settings',
	])
	.provider('opennmsIonicState', function OpenNMSIonicStateProvider() {
		var state = {
			'initialized': false
		};

		this.setInitialized = function(val) {
			state.initialized = val? true:false;
		};

		this.$get = function OpenNMSIonicState() {
			return {
				initialized: function initialized() {
					return state.initialized;
				}
			};
		};
	})
	.config(['$ionicAppProvider', 'opennmsIonicStateProvider', 'config.build.ionicAppId', 'config.build.ionicPublicKey', 'config.build.ionicGcmId', function($ionicAppProvider, ionicStateProvider, appId, publicKey, gcmId) {
		if (publicKey) {
			console.log('Ionic: Public key set.  Initializing.');
			$ionicAppProvider.identify({
				// The App ID (from apps.ionic.io) for the server
				'app_id': appId,
				// The public API key all services will use for this app
				'api_key': publicKey,
				// the Google Cloud Messaging ID
				'gcm_id': gcmId
			});
			ionicStateProvider.setInitialized(true);
		} else {
			console.log('Ionic: Public key not set.  Skipping app initialization.');
		}
	}])
	.factory('IonicService', ['$rootScope', '$ionicPush', '$ionicUser', 'opennmsIonicState', 'Settings', function($rootScope, $ionicPush, $ionicUser, ionicState, Settings) {
		console.log('IonicService: Initializing.');

		var $scope = $rootScope.$new();
		$scope.initialized = ionicState.initialized();

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
	}])

	;

}());
