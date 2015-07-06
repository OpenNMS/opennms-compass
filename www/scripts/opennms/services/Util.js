(function() {
	'use strict';

	/* global cordova: true */
	/* global ionic: true */
	/* global v4: true */
	/* global v6: true */

	angular.module('opennms.services.Util', [
		'ionic',
		'ngCordova',
		'opennms.services.Settings',
	])
	.filter('ip', function() {
		return function(addr) {
			if (addr && addr.contains(':')) {
				var address = new v6.Address(addr);
				if (address.isValid()) {
					return address.correctForm();
				}
			}
			return addr;
		};
	})
	.factory('util', function($rootScope, $state, $window, $cordovaInAppBrowser, $ionicHistory, $ionicViewSwitcher, Settings) {
		console.log('util: Initializing.');

		var eventListeners = {
		};

		var goToDashboard = function(direction) {
			$ionicHistory.nextViewOptions({
				disableBack: true,
				historyRoot: true,
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
			//console.log('util.showKeyboard');
			if ($window.cordova && $window.cordova.plugins && $window.cordova.plugins.Keyboard) {
				cordova.plugins.Keyboard.show();
			}
		};
		var hideKeyboard = function() {
			//console.log('util.hideKeyboard');
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
			Settings.URL().then(function(url) {
				console.log('util.openServer: ' + url);
				$cordovaInAppBrowser.open(url, '_blank');
			});
		};

		var trackEvent = function(category, event, label, value) {
			$rootScope.$broadcast('opennms.analytics.trackEvent', category, event, label, value);
		};

		var markDirty = function(type) {
			console.log('util.markDirty: ' + type);
			$rootScope.$broadcast('opennms.dirty', type);
		};

		var addListener = function(evt, f) {
			if (!eventListeners[evt]) {
				eventListeners[evt] = [];
			}
			eventListeners[evt].push(f);
		};

		$rootScope.$on('opennms.dirty', function(ev, type) {
			if (eventListeners['opennms.dirty'] && eventListeners['opennms.dirty'][type]) {
				console.log('util.onDirty: ' + type);
				$rootScope.$evalAsync(function() {
					var i, len=eventListeners['opennms.dirty'][type].length;
					for (i=0; i < len; i++) {
						eventListeners['opennms.dirty'][type][i]();
					}
				});
			}
		});

		$rootScope.$on('opennms.errors.updated', function(ev, errors) {
			if (eventListeners['opennms.errors.updated']) {
				console.log('util.onErrorsUpdated: ' + angular.toJson(errors));
				$rootScope.$evalAsync(function() {
					var i, len=eventListeners['opennms.errors.updated'].length;
					for (i=0; i < len; i++) {
						eventListeners['opennms.errors.updated'][i](errors);
					}
				});
			}
		});

		$rootScope.$on('opennms.info.updated', function(ev, info) {
			if (eventListeners['opennms.info.updated']) {
				console.log('util.onInfoUpdated: ' + angular.toJson(info));
				$rootScope.$evalAsync(function() {
					var i, len=eventListeners['opennms.info.updated'].length;
					for (i=0; i < len; i++) {
						eventListeners['opennms.info.updated'][i](info);
					}
				});
			}
		});

		$rootScope.$on('opennms.product.updated', function(ev, product) {
			if (eventListeners['opennms.product.updated']) {
				console.log('util.onProductUpdated: ' + product.id);
				$rootScope.$evalAsync(function() {
					var i, len=eventListeners['opennms.product.updated'].length;
					for (i=0; i < len; i++) {
						eventListeners['opennms.product.updated'][i](product);
					}
				});
			}
		});

		$rootScope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
			if (eventListeners['opennms.settings.updated']) {
				console.log('util.onSettingsUpdated: ' + angular.toJson(changedSettings));
				$rootScope.$evalAsync(function() {
					var i, len=eventListeners['opennms.settings.updated'].length;
					for (i=0; i < len; i++) {
						eventListeners['opennms.settings.updated'][i](newSettings, oldSettings, changedSettings);
					}
				});
			}
		});

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
			dirty: markDirty,
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
			onSettingsUpdated: function(f) {
				addListener('opennms.settings.updated', f);
			},
		};
	});

}());
