(function() {
	'use strict';

	/* global ionic: true */
	/* global AdMob: true */

	angular.module('opennms.services.Ads', [
		'ionic',
		'opennms.services.BuildConfig',
		'opennms.services.Config',
		'opennms.services.Info',
		'opennms.services.Rest',
	])
	.factory('Ads', ['$q', '$rootScope', '$timeout', '$window', 'Info', 'RestService', 'Settings',
		'config.build.admobIdAndroidBanner', 'config.build.admobIdIosBanner', 'config.build.admobIdOtherBanner',
		function($q, $rootScope, $timeout, $window, Info, RestService, Settings,
		androidBannerId, iosBannerId, wpBannerId) {

		console.log('Ads: Initializing.');

		var show = function() {
			var showAds = Settings.showAds();
			if (showAds) {
				if(Info.get().packageName !== 'meridian'){
					if ($window.AdMob) {
						var admobid;
						if (ionic.Platform.isIOS()) {
							admobid = iosBannerId;
						} else if (ionic.Platform.isAndroid()) {
							admobid = androidBannerId;
						} else if (ionic.Platform.isWindowsPhone()) {
							admobid = wpBannerId;
						}

						if (admobid) {
							console.log('Ads.show: Creating AdMob banner with ID: ' + admobid);
							$window.AdMob.createBanner({
								'adId': admobid,
								'position': AdMob.AD_POSITION.BOTTOM_CENTER,
								'autoShow': true
							});
						} else {
							console.log('Ads.show: WARNING: Unable to determine platform.');
						}
					} else {
						console.log('Ads.show: AdMob is not available.');
					}
				} else {
					console.log('Ads.show: Remote host is meridian.  Skipping ads.');
				}
			} else {
				console.log('Ads.show: Settings are configured to not show ads.');
			}
		};

		var hide = function() {
			if ($window.AdMob) {
				console.log('Ads.hide: Hiding AdMob banner.');
				$window.AdMob.removeBanner();
			} else {
				console.log('Ads.hide: Admob is not available.');
			}
		};

		$rootScope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
			if (changedSettings.hasOwnProperty('showAds')) {
				$timeout(function() {
					if (changedSettings.showAds) {
						show();
					} else {
						hide();
					}
				}, 1000);
			}
		});

		return {
			show: show,
			hide: hide,
		};
	}]);

}());
