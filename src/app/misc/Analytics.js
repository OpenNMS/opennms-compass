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
	.factory('Analytics', ['$injector', '$log', '$q', '$rootScope', '$window', '$cordovaGoogleAnalytics', 'Settings',
		'config.build.analyticsIdAndroid', 'config.build.analyticsIdIos', 'config.build.analyticsIdOther',
		function($injector, $log, $q, $rootScope, $window, $cordovaGoogleAnalytics, Settings,
		androidAnalyticsId, iosAnalyticsId, otherAnalyticsId) {

		var version = $injector.get('config.build.version'),
			build = $injector.get('config.build.build'),
			numericVersion = null,
			opennmsVersion = null,
			opennmsPlatform = null;

		if (version) {
			numericVersion = parseFloat(version.replace('^(\\d+\\.\\d+).*$', '$1'));
		}

		var ready = $q.defer();

		var listeners = {};

		function trackView(viewName) {
			ready.promise.then(function() {
				$log.debug('Analytics.trackView: view=' + viewName);
				if (opennmsVersion) {
					$cordovaGoogleAnalytics.addCustomDimension(dimensions.opennms_version, opennmsVersion);
				} else {
					$log.debug('Analytics.trackView: no OpenNMS version defined');
				}
				if (opennmsPlatform) {
					$cordovaGoogleAnalytics.addCustomDimension(dimensions.opennms_type, opennmsPlatform);
				} else {
					$log.debug('Analytics.trackView: no OpenNMS platform defined');
				}
				$cordovaGoogleAnalytics.trackView(viewName);
			});
		}

		function trackEvent(category, name, label, value) {
			ready.promise.then(function() {
				$log.debug('Analytics.trackEvent: category=' + category + ', name=' + name + ', label=' + label + ', value=' + value);
				$cordovaGoogleAnalytics.trackEvent(category, name, label, value);
			});
		}

		function init() {
			var oldReady = ready;
			var newReady = $q.defer();
			ready = newReady;

			$log.debug('Analytics.init: Initializing analytics.');
			if ($window && $window.analytics) {
				$log.info('Analytics.init: Enabling analytics.');

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
				if (numericVersion !== null) {
					$cordovaGoogleAnalytics.addCustomDimension(dimensions.version, version);
					$cordovaGoogleAnalytics.addCustomDimension(dimensions.major_version, numericVersion);
					$cordovaGoogleAnalytics.addCustomDimension(dimensions.build, build);
				} else {
					$log.debug('Analytics.trackView: no compass version/build defined');
				}

				listeners.trackEvent = $rootScope.$on('opennms.analytics.trackEvent', function(ev, category, name, label, value) {
					trackEvent(category, name, label, value);
				});

				listeners.trackView = $rootScope.$on('opennms.analytics.trackView', function(ev, viewName) {
					trackView(viewName);
				});

				listeners.trackEnter = $rootScope.$on('$ionicView.enter', function(ev, view) {
					trackView(view.stateName);
				});

				oldReady.resolve(true);
				newReady.resolve(true);
			} else {
				$log.warn('Analytics.init: not available.');
				oldReady.reject('Analytics not available.');
				newReady.reject('Analytics not available.');
			}
			return newReady.promise;
		}

		function deInit() {
			if (listeners === {}) {
				$log.warn('Analytics.deInit: Deinitializing analytics, but we are already not tracking events.');
				return;
			}
			for (var listener in listeners) {
				if ({}.hasOwnProperty.call(listeners, listener)) {
					$log.info('Analytics.deInit: Deinitializing analytics tracker: ' + listener);
					listeners[listener]();
				}
			}
		}

		Settings.isAnalyticsEnabled().then(function(enabled) {
			if (!enabled) {
				$log.info('Analytics: not enabled.');
				return $q.reject('Analytics not enabled.');
			}
			return init();
		});

		$rootScope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
			if (changedSettings.hasOwnProperty('enableAnalytics')) {
				$log.debug('Analytics: analyticsEnabled setting updated: ' + angular.toJson(changedSettings));
				if (changedSettings.enableAnalytics) {
					init();
				} else {
					deInit();
				}
			}
		});

		$rootScope.$on('opennms.info.updated', function(ev, info) {
			opennmsVersion = info.numericVersion;
			opennmsPlatform = info.packageDescription;
		});

		return {
			trackEvent: trackEvent,
			trackView: trackView
		};
	}]);

}());
