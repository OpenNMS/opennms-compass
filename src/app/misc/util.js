(function() {
	'use strict';

	/* global cordova: true */

	var angular = require('angular'),
		lodash = require('lodash'),
		Address6 = require('ip-address').Address6;

	require('ngCordova');

	require('./Analytics');
	require('./Errors');

	require('../servers/Servers');
	require('../settings/SettingsService');

	angular.module('opennms.services.Util', [
		'ionic',
		'ngCordova',
		'opennms.services.Servers',
		'opennms.services.Settings'
	])
	.filter('ip', function($log) {
		return function(addr) {
			if (addr && addr.contains(':')) {
				try {
					var address = new Address6(addr);
					if (address.isValid()) {
						return address.correctForm();
					}
				} catch(err) {
					$log.warn('error formatting ' + addr + ': ' + err);
				}
			}
			return addr;
		};
	})
	.factory('UtilEventBroadcaster', function($rootScope, $log) {
		var markDirty = function(type) {
			if (__DEVELOPMENT__) { $log.debug('util.markDirty: ' + type); }
			$rootScope.$broadcast('opennms.dirty', type);
		};

		var defaultServerUpdated = function(server) {
			if (__DEVELOPMENT__) { $log.debug('util.defaultServerUpdated: ' + angular.toJson(server)); }
			$rootScope.$broadcast('opennms.servers.defaultUpdated', server);
		};

		var serversUpdated = function(newServers, oldServers) {
			if (__DEVELOPMENT__) { $log.debug('util.serversUpdated: ' + angular.toJson(newServers)); }
			$rootScope.$broadcast('opennms.servers.updated', newServers, oldServers);
		};

		var serverRemoved = function(server) {
			if (__DEVELOPMENT__) { $log.debug('util.serversUpdated: ' + server.name); }
			$rootScope.$broadcast('opennms.servers.removed', server);
		};

		return {
			dirty: markDirty,
			serversUpdated: serversUpdated,
			defaultServerUpdated: defaultServerUpdated,
			serverRemoved: serverRemoved
		};
	})
	.factory('UtilEventHandler', function($ionicHistory, $log, $rootScope) {
		var eventListeners = {
		};

		var addListener = function(evt, f) {
			if (!eventListeners[evt]) {
				eventListeners[evt] = [];
			}
			eventListeners[evt].push(f);
		};

		$rootScope.$on('opennms.dirty', function(ev, type) {
			var types = [type], prop;
			if (type === 'all') {
				types = [];
				for (prop in eventListeners) {
					if (eventListeners.hasOwnProperty(prop)) {
						types.push(prop);
					}
				}
			}

			var handleType = function(eventListenerType) {
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListenerType.length; i < len; i++) {
						eventListenerType[i]();
					}
				});
			};

			for (var i=0, len=types.length; i < len; i++) {
				if (eventListeners['opennms.dirty'] && eventListeners['opennms.dirty'][types[i]]) {
					if (__DEVELOPMENT__) { $log.debug('util.onDirty: ' + types[i]); }
					handleType(eventListeners['opennms.dirty'][types[i]]);
				}
			}
		});

		$rootScope.$on('opennms.errors.updated', function(ev, errors) {
			if (eventListeners['opennms.errors.updated']) {
				if (__DEVELOPMENT__) { $log.debug('util.onErrorsUpdated: ' + angular.toJson(errors)); }
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.errors.updated'].length; i < len; i++) {
						eventListeners['opennms.errors.updated'][i](errors);
					}
				});
			}
		});

		var lastInfo = null;
		$rootScope.$on('opennms.info.updated', function(ev, info) {
			lastInfo = info;
			if (eventListeners['opennms.info.updated']) {
				if (__DEVELOPMENT__) { $log.debug('util.onInfoUpdated: ' + angular.toJson(info)); }
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.info.updated'].length; i < len; i++) {
						eventListeners['opennms.info.updated'][i](info);
					}
				});
			}
		});

		$rootScope.$on('opennms.product.updated', function(ev, product) {
			if (eventListeners['opennms.product.updated']) {
				if (__DEVELOPMENT__) { $log.debug('util.onProductUpdated: ' + product.id); }
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.product.updated'].length; i < len; i++) {
						eventListeners['opennms.product.updated'][i](product);
					}
				});
			}
		});

		$rootScope.$on('opennms.servers.defaultUpdated', function(ev, server) {
			if (eventListeners['opennms.servers.defaultUpdated']) {
				if (__DEVELOPMENT__) { $log.debug('util.onDefaultServerUpdated: ' + angular.toJson(server)); }
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.servers.defaultUpdated'].length; i < len; i++) {
						eventListeners['opennms.servers.defaultUpdated'][i](server);
					}
				});
			}
		});

		$rootScope.$on('opennms.servers.updated', function(ev, newServers, oldServers) {
			if (eventListeners['opennms.servers.updated']) {
				if (__DEVELOPMENT__) { $log.debug('util.onServersUpdated: ' + angular.toJson(newServers)); }
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.servers.updated'].length; i < len; i++) {
						eventListeners['opennms.servers.updated'][i](newServers, oldServers);
					}
				});
			}
		});

		$rootScope.$on('opennms.servers.removed', function(ev, server) {
			if (eventListeners['opennms.servers.removed']) {
				if (__DEVELOPMENT__) { $log.debug('util.onServerRemoved: ' + server.name); }
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.servers.removed'].length; i < len; i++) {
						eventListeners['opennms.servers.removed'][i](server);
					}
				});
			}
		});

		$rootScope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
			if (eventListeners['opennms.settings.updated']) {
				if (__DEVELOPMENT__) { $log.debug('util.onSettingsUpdated: ' + angular.toJson(changedSettings)); }
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.settings.updated'].length; i < len; i++) {
						eventListeners['opennms.settings.updated'][i](newSettings, oldSettings, changedSettings);
					}
				});
			}
		});

		document.addEventListener('lowMemory', function() {
			if (eventListeners['opennms.low-memory']) {
				var currentView = $ionicHistory.currentView();
				if (__DEVELOPMENT__) { $log.debug('util.onLowMemory: current view is: ' + currentView.stateName); }
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.low-memory'].length, listener, stateName, callback; i < len; i++) {
						listener = eventListeners['opennms.low-memory'][i];
						stateName = listener[0];
						callback = listener[1];
						if (currentView.stateName === stateName) {
							$log.debug('util.onLowMemory: skipping currently active ' + stateName);
						} else {
							callback(currentView);
						}
					}
				});
			}
		});

		return {
			onDirty: function(type, f) {
				if (!eventListeners['opennms.dirty']) {
					eventListeners['opennms.dirty'] = {};
				}
				if (!eventListeners['opennms.dirty'][type]) {
					eventListeners['opennms.dirty'][type] = [];
				}
				eventListeners['opennms.dirty'][type].push(f);
			},
			onErrorsUpdated: function(f) {
				addListener('opennms.errors.updated', f);
			},
			onInfoUpdated: function(f) {
				addListener('opennms.info.updated', f);
				if (lastInfo) {
					f(lastInfo);
				}
			},
			onProductUpdated: function(f) {
				addListener('opennms.product.updated', f);
			},
			onServersUpdated: function(f) {
				addListener('opennms.servers.updated', f);
			},
			onDefaultServerUpdated: function(f) {
				addListener('opennms.servers.defaultUpdated', f);
			},
			onServerRemoved: function(f) {
				addListener('opennms.servers.removed', f);
			},
			onSettingsUpdated: function(f) {
				addListener('opennms.settings.updated', f);
			},
			onLowMemory: function(stateName, f) {
				addListener('opennms.low-memory', [stateName, f]);
			}
		};
	})
	.factory('util', function($cordovaInAppBrowser, $ionicHistory, $ionicPlatform, $ionicViewSwitcher, $log, $rootScope, $state, $window, Analytics, Servers, Settings, UtilEventBroadcaster, UtilEventHandler) {
		$log.info('util: Initializing.');

		$ionicPlatform.ready(function() {
			if ($window.cordova && $window.cordova.plugins && $window.cordova.plugins.Keyboard) {
				$log.debug('Util: disabling native keyboard scroll.');
				$window.cordova.plugins.Keyboard.disableScroll(true);
				//$window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
			} else {
				$log.debug('Util: no Keyboard plugin found.');
			}
		});

		var goToDashboard = function(direction) {
			$ionicHistory.nextViewOptions({
				disableBack: true,
				historyRoot: true
			});
			if (direction) {
				$ionicViewSwitcher.nextDirection(direction);
			}
			$state.go('dashboard');
		};

		var icons = {
			INDETERMINATE: 'ion-help-circled',
			CLEARED: 'ion-happy',
			NORMAL: 'ion-record',
			WARNING: 'ion-minus-circled',
			MINOR: 'ion-android-alert',
			MAJOR: 'ion-flame',
			CRITICAL: 'ion-nuclear'
		};
		var colors = {
			INDETERMINATE: '#999900',
			CLEARED: '#999',
			NORMAL: 'green',
			WARNING: '#ffcc00',
			MINOR: '#ff9900',
			MAJOR: '#ff3300',
			CRITICAL: '#cc0000'
		};

		var showKeyboard = function() {
			//$log.debug('util.showKeyboard');
			if ($window.cordova && $window.cordova.plugins && $window.cordova.plugins.Keyboard) {
				$window.cordova.plugins.Keyboard.show();
			}
		};
		var hideKeyboard = function() {
			//$log.debug('util.hideKeyboard');
			if ($window.cordova && $window.cordova.plugins && $window.cordova.plugins.Keyboard) {
				$window.cordova.plugins.Keyboard.close();
			}
		};

		var hideSplashscreen = function() {
			if (navigator.splashscreen) {
				navigator.splashscreen.hide();
			}
		};

		var openServer = function() {
			Servers.getDefault().then(function(server) {
				if (server) {
					if (__DEVELOPMENT__) { $log.debug('util.openServer: ' + server.url); }
					$cordovaInAppBrowser.open(server.url, '_blank');
				} else {
					$log.debug('util.openServer: no server defined');
				}
			}, function() {
				$log.debug('util.openServer: unable to get default server');
			});
		};

		function trackEvent(category, event, label, value) {
			Analytics.trackEvent(category, event, label, value);
		}
		function trackView(viewName) {
			Analytics.trackView(viewName);
		}

		function getSeverities() {
			return Object.keys(colors);
		}

		return {
			dashboard: goToDashboard,
			icon: function(severity) {
				var _severity = severity? severity.toUpperCase() : 'INDETERMINATE';
				return icons[_severity] || icons.INDETERMINATE;
			},
			color: function(severity) {
				var _severity = severity? severity.toUpperCase() : 'INDETERMINATE';
				return colors[_severity] || colors.INDETERMINATE;
			},
			severities: getSeverities,
			nextSeverity: function(severity) {
				if (!severity) {
					return severity;
				}
				var severities = getSeverities();
				return severities[Math.min(severities.length-1, severities.indexOf(severity.toUpperCase()) + 1)]; // eslint-disable-line no-magic-numbers
			},
			showKeyboard: showKeyboard,
			hideKeyboard: hideKeyboard,
			hideSplashscreen: hideSplashscreen,
			openServer: openServer,
			trackEvent: trackEvent,
			trackView: trackView,
			dirty: UtilEventBroadcaster.dirty,
			onDirty: UtilEventHandler.onDirty,
			onErrorsUpdated: UtilEventHandler.onErrorsUpdated,
			onInfoUpdated: UtilEventHandler.onInfoUpdated,
			onProductUpdated: UtilEventHandler.onProductUpdated,
			onServersUpdated: UtilEventHandler.onServersUpdated,
			onDefaultServerUpdated: UtilEventHandler.onDefaultServerUpdated,
			onServerRemoved: UtilEventHandler.onServerRemoved,
			onSettingsUpdated: UtilEventHandler.onSettingsUpdated,
			onLowMemory: UtilEventHandler.onLowMemory
		};
	});

}());
