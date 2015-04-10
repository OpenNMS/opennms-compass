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
			console.log('util.showKeyboard');
			if ($window.cordova && $window.cordova.plugins && $window.cordova.plugins.Keyboard) {
				cordova.plugins.Keyboard.show();
			}
		};
		var hideKeyboard = function() {
			console.log('util.hideKeyboard');
			if ($window.cordova && $window.cordova.plugins && $window.cordova.plugins.Keyboard) {
				cordova.plugins.Keyboard.close();
			}
		};

		var openServer = function() {
			console.log('util.openServer: ' + Settings.URL());
			$cordovaInAppBrowser.open(Settings.URL(), '_blank');
		};

		var markDirty = function(type) {
			console.log('util.markDirty: ' + type);
			$rootScope.$broadcast('opennms.dirty', type);
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
			openServer: openServer,
			dirty: markDirty,
		};
	});

}());
