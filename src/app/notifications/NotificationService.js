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

		return {};
	});

}());
