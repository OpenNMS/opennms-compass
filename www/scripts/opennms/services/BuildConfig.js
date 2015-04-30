(function() {
	'use strict';

	angular.module('opennms.services.BuildConfig', [])
		.constant('config.build.version', 'Unknown')
		.constant('config.build.build', 'Unknown')
		.constant('config.build.analyticsIdIos', undefined)
		.constant('config.build.analyticsIdAndroid', undefined)
		.constant('config.build.analyticsIdOther', undefined)
		.constant('config.build.admobIdIosBanner', undefined)
		.constant('config.build.admobIdIosInterstitial', undefined)
		.constant('config.build.admobIdAndroidBanner', undefined)
		.constant('config.build.admobIdAndroidInterstitial', undefined)
		.constant('config.build.admobIdOtherBanner', undefined)
		.constant('config.build.admobIdOtherInterstitial', undefined)
		.constant('config.build.ionicAppId', undefined)
		.constant('config.build.ionicPublicKey', undefined)
		.constant('config.build.ionicGcmId', undefined)
	;

}());
