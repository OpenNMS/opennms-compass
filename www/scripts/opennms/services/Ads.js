(function() {
	'use strict';

	/* global ionic: true */
	/* global AdMob: true */

	angular.module('opennms.services.Ads', [
		'ionic',
		'rt.debounce',
		'opennms.services.BuildConfig',
		'opennms.services.Config',
		'opennms.services.Info',
		'opennms.services.Rest',
		'opennms.services.Settings',
		'opennms.services.Util',
	])
	.factory('Ads', ['$rootScope', '$window', 'debounce', 'Info', 'Settings', 'util',
		'config.build.admobIdAndroidBanner', 'config.build.admobIdIosBanner', 'config.build.admobIdOtherBanner',
		function($rootScope, $window, debounce, Info, Settings, util,
		androidBannerId, iosBannerId, otherBannerId) {

		console.log('Ads: Initializing.');

		var scope = $rootScope.$new();

		scope.waitTime = 1000;

		scope.created = false;
		scope.isMeridian = false;
		scope.showAds = Settings.showAds();

		var updateAds = debounce(scope.waitTime, function() {
			if (!scope.created) {
				console.log('Ads.updateAds: skipping, ad not created yet.');
				return;
			}

			console.log('Ads.updateAds: isMeridian = ' + scope.isMeridian + ', showAds = ' + scope.showAds);

			if (scope.isMeridian) {
				console.log('Ads.updateAds: hiding ads.');
				$window.AdMob.hideBanner();
			} else if (scope.showAds) {
				console.log('Ads.updateAds: showing ads.');
				$window.AdMob.showBanner(AdMob.AD_POSITION.BOTTOM_CENTER);
			} else {
				console.log('Ads.updateAds: hiding ads.');
				$window.AdMob.hideBanner();
			}
		});

		var init = function() {
			if ($window.AdMob) {
				var admobid;
				if (ionic.Platform.isIOS()) {
					admobid = iosBannerId;
				} else if (ionic.Platform.isAndroid()) {
					admobid = androidBannerId;
				} else {
					admobid = otherBannerId;
				}

				if (admobid) {
					console.log('Ads.init: Creating AdMob banner with ID: ' + admobid);
					$window.AdMob.createBanner({
						'adId': admobid,
						'position': AdMob.AD_POSITION.BOTTOM_CENTER,
						'autoShow': false
					});
					scope.created = true;
				} else {
					console.log('Ads.init: WARNING: Unable to determine platform.');
				}
			} else {
				console.log('Ads.init: AdMob is not available.');
			}
		};

		util.onProductUpdated(function(product) {
			if (product.alias.startsWith('disable_ads') && product.owned) {
				Settings.disableAds();
				scope.showAds = false;
			}
		});

		util.onInfoUpdated(function() {
			scope.isMeridian = Info.isMeridian();
		});

		util.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
			scope.showAds = newSettings.showAds;
		});

		scope.$watch('created', updateAds);
		scope.$watch('isMeridian', updateAds);
		scope.$watch('showAds', updateAds);

		return {
			init: init,
		};
	}]);

}());
