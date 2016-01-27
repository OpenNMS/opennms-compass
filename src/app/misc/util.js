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
	.filter('ip', function() {
		return function(addr) {
			if (addr && addr.contains(':')) {
				var address = new Address6(addr);
				if (address.isValid()) {
					return address.correctForm();
				}
			}
			return addr;
		};
	})
	.factory('UtilEventBroadcaster', function($rootScope, $log) {
		var markDirty = function(type) {
			$log.debug('util.markDirty: ' + type);
			$rootScope.$broadcast('opennms.dirty', type);
		};

		var defaultServerUpdated = function(server) {
			$log.debug('util.defaultServerUpdated: ' + angular.toJson(server));
			$rootScope.$broadcast('opennms.servers.defaultUpdated', server);
		};

		var serversUpdated = function(newServers, oldServers) {
			$log.debug('util.serversUpdated: ' + angular.toJson(newServers));
			$rootScope.$broadcast('opennms.servers.updated', newServers, oldServers);
		};

		var serverRemoved = function(server) {
			$log.debug('util.serversUpdated: ' + server.name);
			$rootScope.$broadcast('opennms.servers.removed', server);
		};

		return {
			dirty: markDirty,
			serversUpdated: serversUpdated,
			defaultServerUpdated: defaultServerUpdated,
			serverRemoved: serverRemoved
		};
	})
	.factory('UtilEventHandler', function($rootScope, $log) {
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
					$log.debug('util.onDirty: ' + types[i]);
					handleType(eventListeners['opennms.dirty'][types[i]]);
				}
			}
		});

		$rootScope.$on('opennms.errors.updated', function(ev, errors) {
			if (eventListeners['opennms.errors.updated']) {
				$log.debug('util.onErrorsUpdated: ' + angular.toJson(errors));
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.errors.updated'].length; i < len; i++) {
						eventListeners['opennms.errors.updated'][i](errors);
					}
				});
			}
		});

		$rootScope.$on('opennms.info.updated', function(ev, info) {
			if (eventListeners['opennms.info.updated']) {
				$log.debug('util.onInfoUpdated: ' + angular.toJson(info));
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.info.updated'].length; i < len; i++) {
						eventListeners['opennms.info.updated'][i](info);
					}
				});
			}
		});

		$rootScope.$on('opennms.product.updated', function(ev, product) {
			if (eventListeners['opennms.product.updated']) {
				$log.debug('util.onProductUpdated: ' + product.id);
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.product.updated'].length; i < len; i++) {
						eventListeners['opennms.product.updated'][i](product);
					}
				});
			}
		});

		$rootScope.$on('opennms.servers.defaultUpdated', function(ev, server) {
			if (eventListeners['opennms.servers.defaultUpdated']) {
				$log.debug('util.onDefaultServerUpdated: ' + angular.toJson(server));
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.servers.defaultUpdated'].length; i < len; i++) {
						eventListeners['opennms.servers.defaultUpdated'][i](server);
					}
				});
			}
		});

		$rootScope.$on('opennms.servers.updated', function(ev, newServers, oldServers) {
			if (eventListeners['opennms.servers.updated']) {
				$log.debug('util.onServersUpdated: ' + angular.toJson(newServers));
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.servers.updated'].length; i < len; i++) {
						eventListeners['opennms.servers.updated'][i](newServers, oldServers);
					}
				});
			}
		});

		$rootScope.$on('opennms.servers.removed', function(ev, server) {
			if (eventListeners['opennms.servers.removed']) {
				$log.debug('util.onServerRemoved: ' + server.name);
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.servers.removed'].length; i < len; i++) {
						eventListeners['opennms.servers.removed'][i](server);
					}
				});
			}
		});

		$rootScope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
			if (eventListeners['opennms.settings.updated']) {
				$log.debug('util.onSettingsUpdated: ' + angular.toJson(changedSettings));
				$rootScope.$evalAsync(function() {
					for (var i=0, len=eventListeners['opennms.settings.updated'].length; i < len; i++) {
						eventListeners['opennms.settings.updated'][i](newSettings, oldSettings, changedSettings);
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
			}
		};
	})
	.factory('util', function($rootScope, $log, $state, $window, $cordovaInAppBrowser, $ionicHistory, $ionicPlatform, $ionicViewSwitcher, Servers, Settings, UtilEventBroadcaster, UtilEventHandler) {
		$log.info('util: Initializing.');

		$ionicPlatform.ready(function() {
			if (typeof cordova.plugins.Keyboard !== 'undefined') {
				$log.debug('Util: disabling native keyboard scroll.');
				cordova.plugins.Keyboard.disableScroll(true);
				cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
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
			MINOR: 'ion-alert-circled',
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
				cordova.plugins.Keyboard.show();
			}
		};
		var hideKeyboard = function() {
			//$log.debug('util.hideKeyboard');
			if ($window.cordova && $window.cordova.plugins && $window.cordova.plugins.Keyboard) {
				cordova.plugins.Keyboard.close();
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
					$log.debug('util.openServer: ' + server.url);
					$cordovaInAppBrowser.open(server.url, '_blank');
				} else {
					$log.debug('util.openServer: no server defined');
				}
			}, function() {
				$log.debug('util.openServer: unable to get default server');
			});
		};

		var trackEvent = function(category, event, label, value) {
			$rootScope.$broadcast('opennms.analytics.trackEvent', category, event, label, value);
		};


		return {
			dashboard: goToDashboard,
			icon: function(severity) {
				severity = severity? severity.toUpperCase() : 'INDETERMINATE';
				return icons[severity] || icons.INDETERMINATE;
			},
			color: function(severity) {
				severity = severity? severity.toUpperCase() : 'INDETERMINATE';
				return colors[severity] || colors.INDETERMINATE;
			},
			severities: function() {
				var ret = [];
				for (var sev in colors) {
					ret.push(sev);
				}
				return ret;
			},
			showKeyboard: showKeyboard,
			hideKeyboard: hideKeyboard,
			hideSplashscreen: hideSplashscreen,
			openServer: openServer,
			trackEvent: trackEvent,
			dirty: UtilEventBroadcaster.dirty,
			onDirty: UtilEventHandler.onDirty,
			onErrorsUpdated: UtilEventHandler.onErrorsUpdated,
			onInfoUpdated: UtilEventHandler.onInfoUpdated,
			onProductUpdated: UtilEventHandler.onProductUpdated,
			onServersUpdated: UtilEventHandler.onServersUpdated,
			onDefaultServerUpdated: UtilEventHandler.onDefaultServerUpdated,
			onServerRemoved: UtilEventHandler.onServerRemoved,
			onSettingsUpdated: UtilEventHandler.onSettingsUpdated
		};
	});

}());
