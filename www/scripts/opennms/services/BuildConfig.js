(function() {
	'use strict';

	angular.module('opennms.services.BuildConfig', [])
		.value('config.build.version', 'Unknown')
		.value('config.build.build', 'Unknown')
        .value('config.build.analyticsIdIos', undefined)
        .value('config.build.analyticsIdAndroid', undefined)
        .value('config.build.analyticsIdOther', undefined)
        .value('config.build.admobIdIosBanner', undefined)
        .value('config.build.admobIdIosInterstitial', undefined)
        .value('config.build.admobIdAndroidBanner', undefined)
        .value('config.build.admobIdAndroidInterstitial', undefined)
        .value('config.build.admobIdOtherBanner', undefined)
        .value('config.build.admobIdOtherInterstitial', undefined)
	;

}());
