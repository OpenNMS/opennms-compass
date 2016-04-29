(function() {
	'use strict';

	var angular = require('angular'),
		ionic = require('ionic/release/js/ionic');

	require('ngCordova');

	require('../settings/SettingsService');

	angular.module('opennms.services.Analytics', [
		'ionic',
		'ngCordova',
		'opennms.services.Settings'
	])
	.factory('Analytics', ['$rootScope', '$log', '$window', '$cordovaGoogleAnalytics', 'Settings',
		'config.build.analyticsIdAndroid', 'config.build.analyticsIdIos', 'config.build.analyticsIdOther',
		function($rootScope, $log, $window, $cordovaGoogleAnalytics, Settings,
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
			$cordovaGoogleAnalytics.debugMode();
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
