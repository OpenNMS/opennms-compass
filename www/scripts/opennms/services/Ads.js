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
		'opennms.services.Util',
	])
	.factory('Ads', ['$q', '$rootScope', '$timeout', '$window', '$ionicPlatform', 'Info', 'RestService', 'Settings', 'util',
		'config.build.admobIdAndroidBanner', 'config.build.admobIdIosBanner', 'config.build.admobIdOtherBanner',
		function($q, $rootScope, $timeout, $window, $ionicPlatform, Info, RestService, Settings, util,
		androidBannerId, iosBannerId, wpBannerId) {

		console.log('Ads: Initializing.');

		var adsShown = false;

		var show = function() {
			if (adsShown) {
				// ads are already shown, skip it
				return;
			}

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
					adsShown = true;
				} else {
					console.log('Ads.show: WARNING: Unable to determine platform.');
				}
			} else {
				console.log('Ads.show: AdMob is not available.');
			}
		};

		var hide = function() {
			if (!adsShown) {
				// ads are already hidden, skip it
				return;
			}

			if ($window.AdMob) {
				console.log('Ads.hide: Hiding AdMob banner.');
				$window.AdMob.removeBanner();
			} else {
				console.log('Ads.hide: Admob is not available.');
			}
			adsShown = false;
		};

		var updateAds = function() {
			$timeout(function() {
				var showAds = Settings.showAds();

				if (Info.isMeridian()) {
					console.log('Ads.updateAds: remote host is Meridian.');
					hide();
				} else if (showAds) {
					show();
				} else {
					hide();
				}
			}, 500);
		};

		util.onSettingsUpdated(updateAds);
		util.onProductUpdated(updateAds);

		$ionicPlatform.ready(updateAds);

		return {
			show: show,
			hide: hide,
		};
	}]);

}());
