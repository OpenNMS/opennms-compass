(function() {
	'use strict';

	var angular = require('angular');

	/*
	require('../db/db');
	require('../servers/Servers');

	require('../misc/Capabilities');
	require('../misc/Rest');
	*/

	require('../misc/util');

	angular.module('opennms.services.Notifications', [
		'ionic',
		'opennms.services.Util'
		/*
		'uuid4',
		'opennms.services.Capabilities',
		'opennms.services.DB',
		'opennms.services.Rest',
		'opennms.services.Servers',
		'opennms.services.Util'
		*/
	])
	.factory('NotificationService', function($log, $ionicPlatform, util) {
		$log.info('NotificationService: Initializing.');

		var registerForPush = function() {
			$log.debug('registering for push');

			var push = PushNotification.init({
				ios: {
					alert: true,
					badge: true,
					sound: true
				}
			});

			push.on('registration', function(data) {
				$log.debug('NotificationService.registration: complete: ' + angular.toJson(data));
			});
			push.on('notification', function(data) {
				$log.debug('NotificationService.notification: ' + angular.toJson(data));
			});
			push.on('error', function(data) {
				$log.debug('NotificationService.error: ' + angular.toJson(data));
			});
		};

		$ionicPlatform.ready(function() {
			registerForPush();
		});

		return {};
	});

}());
