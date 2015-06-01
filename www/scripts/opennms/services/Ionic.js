(function() {
	'use strict';

	/* global cordova: true */
	/* global ionic: true */

	angular.module('opennms.services.Ionic', [
		'ionic',
		'ionic.service.core',
		'ngCordova',
		'opennms.services.BuildConfig',
		'opennms.services.Config',
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
	;

}());
