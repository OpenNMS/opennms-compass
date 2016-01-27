(function() {
	'use strict';

	var angular = require('angular'),
		ionic = require('ionic/release/js/ionic');

	require('../settings/SettingsService');

	require('../app/misc/BuildConfig');
	require('../app/misc/Info');
	require('../app/misc/util');

	angular.module('opennms.services.Ads', [
		'ionic',
		'rt.debounce',
		'opennms.services.BuildConfig',
		'opennms.services.Settings',
		'opennms.services.Info',
		'opennms.services.Rest',
		'opennms.services.Settings',
		'opennms.services.Util'
	])
	.factory('Ads', ['$rootScope', '$log', '$window', 'debounce', 'Info', 'Settings', 'util',
		'config.build.debug',
		'config.build.admobIdAndroidBanner', 'config.build.admobIdIosBanner', 'config.build.admobIdOtherBanner',
		function($rootScope, $log, $window, debounce, Info, Settings, util,
		debug,
		androidBannerId, iosBannerId, otherBannerId) {

		$log.info('Ads: Initializing.');

		var scope = $rootScope.$new();

		scope.waitTime = 1000;

		scope.created = false;
		scope.isMeridian = false;
		Settings.showAds().then(function(showAds) {
			if (debug) {
				$log.debug('Ads.onSettingsUpdated: config.build.debug = true, skipping ads.');
				scope.showAds = false;
			} else {
				scope.showAds = showAds;
			}
		});

		var updateAds = debounce(scope.waitTime, function() {
			if (!scope.created) {
				$log.info('Ads.updateAds: skipping, ad not created yet.');
				return;
			}

			$log.debug('Ads.updateAds: isMeridian = ' + scope.isMeridian + ', showAds = ' + scope.showAds);

			if (scope.isMeridian) {
				$log.debug('Ads.updateAds: hiding ads.');
				$window.AdMob.hideBanner();
			} else if (scope.showAds) {
				$log.debug('Ads.updateAds: showing ads.');
				$window.AdMob.showBanner($window.AdMob.AD_POSITION.BOTTOM_CENTER);
			} else {
				$log.debug('Ads.updateAds: hiding ads.');
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
					$log.debug('Ads.init: Creating AdMob banner with ID: ' + admobid);
					$window.AdMob.createBanner({
						adId: admobid,
						position: $window.AdMob.AD_POSITION.BOTTOM_CENTER,
						autoShow: false
					});
					scope.created = true;
				} else {
					$log.error('Ads.init: WARNING: Unable to determine platform.');
				}
			} else {
				$log.error('Ads.init: AdMob is not available.');
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
			if (debug) {
				$log.debug('Ads.onSettingsUpdated: config.build.debug = true, skipping ads.');
				scope.showAds = false;
			} else {
				scope.showAds = newSettings.showAds;
			}
		});

		scope.$watchGroup(['created', 'isMeridian', 'showAds'], updateAds);

		return {
			init: init
		};
	}]);

}());
