(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Analytics', [
		'ionic',
		'ngCordova',
		'opennms.services.Config',
		'opennms.services.Settings',
	])
	.factory('Analytics', ['$rootScope', '$ionicPlatform', '$cordovaGoogleAnalytics', 'Settings',
		'config.build.analyticsIdAndroid', 'config.build.analyticsIdIos', 'config.build.analyticsIdOther',
		function($rootScope, $ionicPlatform, $cordovaGoogleAnalytics, Settings,
		androidAnalyticsId, iosAnalyticsId, otherAnalyticsId) {

		console.log('Analytics: Initializing.');

		$ionicPlatform.ready(function() {
			$cordovaGoogleAnalytics.debugMode();
			if (ionic.Platform.isIOS() && iosAnalyticsId) {
				$cordovaGoogleAnalytics.startTrackerWithId(iosAnalyticsId);
			} else if (ionic.Platform.isAndroid() && androidAnalyticsId) {
				$cordovaGoogleAnalytics.startTrackerWithId(androidAnalyticsId);
			} else if (otherAnalyticsId) {
				$cordovaGoogleAnalytics.startTrackerWithId(otherAnalyticsId);
			}
			$cordovaGoogleAnalytics.setUserId(Settings.uuid());


			$rootScope.$on('opennms.analytics.trackEvent', function(ev, category, name, label, value) {
				$cordovaGoogleAnalytics.trackEvent(category, name, label, value);
			});

			$rootScope.$on('$ionicView.enter', function(ev, view) {
				$cordovaGoogleAnalytics.trackView(view.stateName);
			});
		});

		var trackView = function(viewName) {
			$ionicPlatform.ready(function() {
				$cordovaGoogleAnalytics.trackView(viewName);
			});
		};

		return {
			trackView: trackView,
		};
	}]);

}());
