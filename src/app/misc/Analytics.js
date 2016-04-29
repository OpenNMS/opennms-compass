(function() {
	'use strict';

	var angular = require('angular'),
		ionic = require('ionic/release/js/ionic');

	require('ngCordova');

	require('../settings/SettingsService');

	var dimensions = {
		version: 'dimension1',
		major_version: 'dimension2',
		build: 'dimension3',
		opennms_version: 'dimension4',
		opennms_type: 'dimension5'
	};

	angular.module('opennms.services.Analytics', [
		'ionic',
		'ngCordova',
		'opennms.services.Settings'
	])
	.factory('Analytics', ['$injector', '$log', '$rootScope', '$window', '$cordovaGoogleAnalytics', 'Settings',
		'config.build.analyticsIdAndroid', 'config.build.analyticsIdIos', 'config.build.analyticsIdOther',
		function($injector, $log, $rootScope, $window, $cordovaGoogleAnalytics, Settings,
		androidAnalyticsId, iosAnalyticsId, otherAnalyticsId) {

		$log.info('Analytics: Initializing.');

		function trackView(viewName) {
			$log.debug('Analytics.trackView: view=' + viewName);
			$cordovaGoogleAnalytics.trackView(viewName);
		}

		function trackEvent(category, name, label, value) {
			$log.debug('Analytics.trackEvent: category=' + category + ', name=' + name + ', label=' + label + ', value=' + value);
			$cordovaGoogleAnalytics.trackEvent(category, name, label, value);
		}

		if ($window && $window.analytics) {
			if (__DEVELOPMENT__) {
				$cordovaGoogleAnalytics.debugMode();
			}
			if (ionic.Platform.isIOS() && iosAnalyticsId) {
				$cordovaGoogleAnalytics.startTrackerWithId(iosAnalyticsId);
			} else if (ionic.Platform.isAndroid() && androidAnalyticsId) {
				$cordovaGoogleAnalytics.startTrackerWithId(androidAnalyticsId);
			} else if (otherAnalyticsId) {
				$cordovaGoogleAnalytics.startTrackerWithId(otherAnalyticsId);
			}
			Settings.uuid().then(function(uuid) {
				$cordovaGoogleAnalytics.setUserId(uuid);
			});

			var version = $injector.get('config.build.version');
			if (version) {
				var build = $injector.get('config.build.build');
				var numericVersion = parseFloat(version.replace('^(\\d+\\.\\d+).*$', '$1'));
				//$cordovaGoogleAnalytics.addCustomDimension(dimensions.version, version);
				$cordovaGoogleAnalytics.addCustomDimension(dimensions.major_version, numericVersion);
				$cordovaGoogleAnalytics.addCustomDimension(dimensions.build, build);
			}

			$rootScope.$on('opennms.info.updated', function(ev, info) {
				if (info.numericVersion > 0) {
					$cordovaGoogleAnalytics.addCustomDimension(dimensions.opennms_version, info.version);
					$cordovaGoogleAnalytics.addCustomDimension(dimensions.opennms_platform, info.packageName);
				}
			});

			$rootScope.$on('opennms.analytics.trackEvent', function(ev, category, name, label, value) {
				trackEvent(category, name, label, value);
			});

			$rootScope.$on('opennms.analytics.trackView', function(ev, viewName) {
				trackView(viewName);
			});

			$rootScope.$on('$ionicView.enter', function(ev, view) {
				trackView(view.stateName);
			});
		}

		return {
			trackEvent: trackEvent,
			trackView: trackView
		};
	}]);

}());
