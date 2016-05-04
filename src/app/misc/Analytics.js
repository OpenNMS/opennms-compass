(function() {
	'use strict';

	var angular = require('angular'),
		ionic = require('ionic/release/js/ionic');

	require('ngCordova');

	require('../settings/SettingsService');

	var dimensions = {
		version: '1',
		major_version: '2',
		build: '3',
		opennms_version: '4',
		opennms_type: '5',
		opennms_major_version: '6'
	};

	angular.module('opennms.services.Analytics', [
		'ionic',
		'ngCordova',
		'opennms.services.Settings'
	])
	.factory('Analytics', ['$injector', '$ionicHistory', '$log', '$q', '$rootScope', '$window', '$cordovaGoogleAnalytics', 'Settings',
		'config.build.analyticsIdAndroid', 'config.build.analyticsIdIos', 'config.build.analyticsIdOther',
		function($injector, $ionicHistory, $log, $q, $rootScope, $window, $cordovaGoogleAnalytics, Settings,
		androidAnalyticsId, iosAnalyticsId, otherAnalyticsId) {

		var version = $injector.get('config.build.version'),
			build = $injector.get('config.build.build'),
			numericVersion = null;

		if (version) {
			numericVersion = parseFloat(version.replace('^(\\d+\\.\\d+).*$', '$1'));
		}

		var initialized = $q.defer();

		var listeners = {};

		function enableExceptionReporting() {
			if (!window || !$window.analytics) {
				return $q.reject('Analytics not available.');
			}

			var deferred = $q.defer();
			$window.analytics.enableUncaughtExceptionReporting(true, function() {
				$rootScope.$evalAsync(function() {
					$log.debug('Analytics.init: Enabled uncaught exception reporting.');
					deferred.resolve(true);
				});
			}, function(err) {
				$rootScope.$evalAsync(function() {
					$log.warn('Analytics.init: Failed to enable uncaught exception reporting: ' + angular.toJson(err));
					deferred.reject(err);
				});
			});
			return deferred.promise;
		}

		function startTracker() {
			if (!$window || !$window.analytics) {
				return $q.reject('Analytics not available.');
			}

			if (ionic.Platform.isIOS() && iosAnalyticsId) {
				$log.debug('Analytics.configureAnalytics: using iOS analytics ID ' + iosAnalyticsId);
				return $cordovaGoogleAnalytics.startTrackerWithId(iosAnalyticsId);
			} else if (ionic.Platform.isAndroid() && androidAnalyticsId) {
				$log.debug('Analytics.configureAnalytics: using Android analytics ID ' + androidAnalyticsId);
				return $cordovaGoogleAnalytics.startTrackerWithId(androidAnalyticsId);
			} else if (otherAnalyticsId) {
				$log.debug('Analytics.configureAnalytics: using mobile analytics ID ' + otherAnalyticsId);
				return $cordovaGoogleAnalytics.startTrackerWithId(otherAnalyticsId);
			}

			return $q.reject('no analytics ID configured');
		}

		function configureListeners() {
			if (!$window || !$window.analytics) {
				return $q.reject('Analytics not available.');
			}

			if (listeners.trackEvent) {
				listeners.trackEvent();
			}
			listeners.trackEvent = $rootScope.$on('opennms.analytics.trackEvent', function(ev, category, name, label, value) {
				trackEvent(category, name, label, value);
			});

			if (listeners.trackView) {
				listeners.trackView();
			}
			listeners.trackView = $rootScope.$on('opennms.analytics.trackView', function(ev, viewName) {
				trackView(viewName);
			});

			if (listeners.trackEnter) {
				listeners.trackEnter();
			}
			listeners.trackEnter = $rootScope.$on('$ionicView.enter', function(ev, view) {
				trackView(view.stateName);
			});

			$log.debug('Analytics: listeners configured.');
			return $q.when(true);
		}

		function configureUserId() {
			if (!$window || !$window.analytics) {
				return $q.reject('Analytics not available.');
			}

			return Settings.uuid().then(function(uuid) {
				return $cordovaGoogleAnalytics.setUserId(uuid);
			}).then(function(res) {
				$log.debug('Analytics: configured user ID.');
				return res;
			});
		}

		function configureAnalytics() {
			if (!$window || !$window.analytics) {
				return $q.reject('Analytics not available.');
			}

			if (__DEVELOPMENT__) {
				$log.debug('Analytics.configureAnalytics: enabling debug mode.');
				$cordovaGoogleAnalytics.debugMode();
			}

			return startTracker().then(function() {
				return enableExceptionReporting();
			}).then(function() {
				return configureUserId();
			}).then(function() {
				return configureListeners();
			});
		}

		function addDimensions() {
			return initialized.promise.then(function() {
				if (!$injector.has('Info')) {
					return $q.reject('Info service not available yet');
				}

				var Info = $injector.get('Info');
				return Info.getInitialized().then(function(info) {
					if (info.version) {
						$cordovaGoogleAnalytics.addCustomDimension(dimensions.opennms_version, info.version).catch(function(err) {
							$log.warn('Analytics.addDimensions: unable to add custom dimension ' + dimensions.opennms_version + ': ' + err);
						});
					} else {
						$log.debug('Analytics.addDimensions: no OpenNMS version defined');
					}

					if (info.numericVersion) {
						$cordovaGoogleAnalytics.addCustomDimension(dimensions.opennms_major_version, info.numericVersion).catch(function(err) {
							$log.warn('Analytics.addDimensions: unable to add custom dimension ' + dimensions.opennms_major_version + ': ' + err);
						});
					} else {
						$log.debug('Analytics.addDimensions: no OpenNMS major version defined');
					}

					if (info.packageDescription) {
						$cordovaGoogleAnalytics.addCustomDimension(dimensions.opennms_type, info.packageDescription).catch(function(err) {
							$log.warn('Analytics.addDimensions: unable to add custom dimension ' + dimensions.opennms_type + ': ' + err);
						});
					} else {
						$log.debug('Analytics.addDimensions: no OpenNMS platform defined');
					}

					if (numericVersion !== null) {
						$cordovaGoogleAnalytics.addCustomDimension(dimensions.version, version);
						$cordovaGoogleAnalytics.addCustomDimension(dimensions.major_version, numericVersion);
						$cordovaGoogleAnalytics.addCustomDimension(dimensions.build, build);
					} else {
						$log.debug('Analytics.addDimensions: no compass version/build defined');
					}
				});
			});
		}

		function trackView(viewName) {
			return addDimensions().then(function() {
				$log.debug('Analytics.trackView: view=' + viewName);
				return $cordovaGoogleAnalytics.trackView(viewName);
			}).catch(function(err) {
				$log.debug('Analytics.trackView: failed to track "' + viewName + '": ' + err);
				return $q.reject(err);
			});
		}

		function trackEvent(category, name, label, value) {
			return addDimensions().then(function() {
				$log.debug('Analytics.trackEvent: category=' + category + ', name=' + name + ', label=' + label + ', value=' + value);
				$cordovaGoogleAnalytics.trackEvent(category, name, label, value);
			}).catch(function(err) {
				$log.debug('Analytics.trackEvent: failed to track ' + category + '/' + name + '/' + label + ': ' + err);
				return $q.reject(err);
			});
		}

		function init() {
			var oldInitialized = initialized;
			var newInitialized = $q.defer();
			initialized = newInitialized;

			return configureAnalytics().then(function(res) {
				oldInitialized.resolve(res);
				newInitialized.resolve(res);
				return newInitialized.promise;
			}).catch(function(err) {
				oldInitialized.reject(err);
				newInitialized.reject(err);
				return $q.reject(err);
			}).then(function() {
				var currentView = $ionicHistory.currentView();
				if (currentView && currentView.stateName) {
					return trackView(currentView.stateName);
				}
				return $q.when();
			}).catch(function(err) {
				$log.warn('Analytics.init: Failed to initialize analytics: ' + err);
			});
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

		return {
			trackEvent: trackEvent,
			trackView: trackView
		};
	}]);

}());
