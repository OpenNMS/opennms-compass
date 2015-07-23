(function() {
	'use strict';

	/* global cordova: true */
	/* global ionic: true */
	/* global v4: true */
	/* global v6: true */

	angular.module('opennms.services.Util', [
		'ionic',
		'ngCordova',
		'opennms.services.Servers',
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
	.config(function() {
		ionic.Platform.ready(function() {
			if (cordova && cordova.plugins && cordova.plugins.Keyboard) {
				console.log('Util: disabling native keyboard scroll.');
				cordova.plugins.Keyboard.disableScroll(true);
			}
		});
	})
	.factory('UtilEventBroadcaster', function($rootScope) {
		var markDirty = function(type) {
			console.log('util.markDirty: ' + type);
			$rootScope.$broadcast('opennms.dirty', type);
		};

		var serversUpdated = function(newServers, oldServers, defaultServer) {
			console.log('util.serversUpdated: ' + angular.toJson(newServers));
			$rootScope.$broadcast('opennms.servers.updated', newServers, oldServers, defaultServer);
		};

		var serverRemoved = function(server) {
			console.log('util.serversUpdated: ' + server.name);
			$rootScope.$broadcast('opennms.servers.removed', server);
		};

		return {
			dirty: markDirty,
			serversUpdated: serversUpdated,
			serverRemoved: serverRemoved,
		};
	})
	.factory('UtilEventHandler', function($rootScope) {
		var eventListeners = {
		};

		var addListener = function(evt, f) {
			if (!eventListeners[evt]) {
				eventListeners[evt] = [];
			}
			eventListeners[evt].push(f);
		};

		$rootScope.$on('opennms.dirty', function(ev, type) {
			var types = [type], prop, i, len;
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
					var j, jlen=eventListenerType.length;
					for (j=0; j < jlen; j++) {
						eventListenerType[j]();
					}
				});
			};

			len = types.length;
			for (i=0; i < len; i++) {
				if (eventListeners['opennms.dirty'] && eventListeners['opennms.dirty'][types[i]]) {
					console.log('util.onDirty: ' + types[i]);
					handleType(eventListeners['opennms.dirty'][types[i]]);
				}
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

		$rootScope.$on('opennms.servers.updated', function(ev, newServers, oldServers, defaultServer) {
			if (eventListeners['opennms.servers.updated']) {
				console.log('util.onServersUpdated: ' + angular.toJson(newServers));
				$rootScope.$evalAsync(function() {
					var i, len=eventListeners['opennms.servers.updated'].length;
					for (i=0; i < len; i++) {
						eventListeners['opennms.servers.updated'][i](newServers, oldServers, defaultServer);
					}
				});
			}
		});

		$rootScope.$on('opennms.servers.removed', function(ev, server) {
			if (eventListeners['opennms.servers.removed']) {
				console.log('util.onServerRemoved: ' + server.name);
				$rootScope.$evalAsync(function() {
					var i, len=eventListeners['opennms.servers.removed'].length;
					for (i=0; i < len; i++) {
						eventListeners['opennms.servers.removed'][i](server);
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
			onServerRemoved: function(f) {
				addListener('opennms.servers.removed', f);
			},
			onSettingsUpdated: function(f) {
				addListener('opennms.settings.updated', f);
			},
		};
	})
	.factory('util', function($rootScope, $state, $window, $cordovaInAppBrowser, $ionicHistory, $ionicViewSwitcher, Servers, Settings, UtilEventBroadcaster, UtilEventHandler) {
		console.log('util: Initializing.');

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
			Servers.getDefault().then(function(server) {
				if (server) {
					console.log('util.openServer: ' + server.url);
					$cordovaInAppBrowser.open(server.url, '_blank');
				} else {
					console.log('util.openServer: no server defined');
				}
			}, function() {
				console.log('util.openServer: unable to get default server');
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
			onServerRemoved: UtilEventHandler.onServerRemoved,
			onSettingsUpdated: UtilEventHandler.onSettingsUpdated,
		};
	});

}());
