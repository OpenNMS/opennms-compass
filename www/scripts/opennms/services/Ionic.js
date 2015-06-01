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

		$rootScope.$on('$cordovaPush:tokenReceived', function(ev, data) {
			console.log('IonicService.init: got device token: ' + angular.toJson(data));
			$scope.token = data.token;
		});

		var init = function initialize() {
			var user = $ionicUser.get();
			if (!user) {
				user = {};
			}
			if (!user.user_id) {
				user.user_id = $ionicUser.generateGUID();
			}
			angular.extend(user, {
				server: Settings.URL(),
				username: Settings.username()
			});

			console.log('IonicService.init: identifying user: ' + angular.toJson(user));
			$ionicUser.identify(user).then(function() {
				console.log('IonicService.init: user identified.  Registering for notifications.');
				$ionicPush.register({
					canShowAlert: true,
					canSetBadge: true,
					canPlaySound: true,
					canRunActionsOnWake: true,
					onNotification: function(notification) {
						console.log('IonicService.init: received notification: ' + angular.toJson(notification));
					}
				}).then(undefined, function(err) {
					console.log('IonicService.init: failed to get device token: ' + angular.toJson(err));
				});
			}, function(err) {
				console.log('IonicService.init: Failed to identify user: ' + angular.toJson(err));
			});
		};

		if ($scope.initialized) {
			init();
		} else {
			console.log('IonicService: Skipping service initialization.');
		}

		return {
		};
	}])

	;

}());
