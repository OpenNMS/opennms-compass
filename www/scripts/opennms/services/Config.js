(function() {
	'use strict';

	/* global moment: true */

	angular.module('opennms.services.Config', [])
		.value('config.app.default-server-url', undefined)
		.value('config.app.default-username', undefined)
		.value('config.app.default-password', undefined)
		.value('config.app.rest.limit', 100)
		.value('config.app.refresh-interval', 30000)
	;

	angular.module('opennms.services.Settings', [
		'angularLocalStorage',
		'opennms.services.BuildConfig',
		'opennms.services.Config',
	])
	.factory('Settings', ['storage', '$rootScope', '$injector', function(storage, $rootScope, $injector) {
		var $scope = $rootScope.$new();

		$scope.settings = storage.get('opennms.settings');
		if (!$scope.settings || $scope.settings === 'undefined') {
			$scope.settings = {};
		}
		if (!$scope.settings.server) {
			$scope.settings.server = $injector.get('config.app.default-server-url');
		}
		if (!$scope.settings.username) {
			$scope.settings.username = $injector.get('config.app.default-username');
		}
		if (!$scope.settings.password) {
			$scope.settings.password = $injector.get('config.app.default-password');
		}
		if (!$scope.settings.restLimit) {
			$scope.settings.restLimit = $injector.get('config.app.rest.limit');
		}
		if (!$scope.settings.refreshInterval || isNaN(parseInt($scope.settings.refreshInterval, 10))) {
			$scope.settings.refreshInterval = $injector.get('config.app.refresh-interval');
		}
		if ($scope.settings.showAds === undefined || $scope.settings.showAds === 'undefined') {
			$scope.settings.showAds = true;
		}

		$scope.$on('opennms.product.updated', function(ev, product) {
			if (product.alias.startsWith('disable_ads') && product.owned) {
				var settings = getSettings();
				settings.showAds = false;
				saveSettings(settings);
			}
		});

		var getSettings = function() {
			return angular.copy($scope.settings);
		};
		var saveSettings = function(settings) {
			if (!settings) {
				console.log('Settings.saveSettings: ERROR: no settings provided.');
				return false;
			}

			var changedSettings = {};

			if (!settings.server || settings.server === 'undefined' || settings.server === '') {
				settings.server = undefined;
			}
			if (settings.server && !settings.server.endsWith('/')) {
				settings.server += '/';
			}

			if (!settings.username || settings.username === 'undefined' || settings.username === '') {
				settings.username = undefined;
			}

			if (!settings.password || settings.password === 'undefined' || settings.password === '') {
				settings.password = undefined;
			}

			if (settings.showAds === undefined || settings.showAds === 'undefined') {
				settings.showAds = true;
			}
			if (settings.refreshInterval === undefined || settings.refreshInterval === 'undefined') {
				settings.refreshInterval = undefined;
			} else {
				settings.refreshInterval =  parseInt(settings.refreshInterval, 10);
				if (isNaN(settings.refreshInterval)) {
					settings.refreshInterval = $injector.get('config.app.refresh-interval');
				}
			}

			var oldSettings = angular.copy($scope.settings);
			var newSettings = angular.copy(settings);

			for (var prop in newSettings) {
				if (newSettings.hasOwnProperty(prop) && newSettings[prop] !== oldSettings[prop]) {
					changedSettings[prop] = newSettings[prop];
				}
			}

			var o = angular.toJson(oldSettings),
				n = angular.toJson(newSettings);

			console.log('Settings.saveSettings: Old Settings: ' + o);
			console.log('Settings.saveSettings: New Settings: ' + n);
			if (o === n) {
				console.log('Settings.saveSettings: settings are unchanged.');
			} else {
				console.log('Settings.saveSettings: settings have changed.  Updating.');
				storage.set('opennms.settings', newSettings);
				$scope.settings = newSettings;
				$rootScope.$broadcast('opennms.settings.changed', newSettings, oldSettings, changedSettings);
			}

			return true;
		};

		return {
			get: getSettings,
			set: saveSettings,
			getServerName: function() {
				var server = getSettings().server;
				if (server) {
					var a = document.createElement('a');
					a.href = server;
					return a.hostname;
				} else {
					return undefined;
				}
			},
			restLimit: function() {
				return getSettings().restLimit;
			},
			refreshInterval: function() {
				var interval = parseInt(getSettings().refreshInterval, 10);
				if (isNaN(interval) || interval === 0) {
					interval = $injector.get('config.app.refresh-interval');
				}
				return interval;
			},
			URL: function() {
				return getSettings().server;
			},
			restURL: function() {
				var settings = getSettings();
				if (settings && settings.server) {
					return settings.server + 'rest/';
				} else {
					return undefined;
				}
			},
			showAds: function() {
				return getSettings().showAds;
			},
			username: function() {
				return getSettings().username;
			},
			password: function() {
				return getSettings().password;
			},
			disableAds: function() {
				var settings = getSettings();
				settings.showAds = false;
				saveSettings(settings);
			},
			isServerConfigured: function() {
				var settings = getSettings();
				return (settings.server && settings.username && settings.password);
			},
			version: function() {
				return $injector.get('config.build.version');
			},
			build: function() {
				return $injector.get('config.build.build');
			}
		};
	}]);
}());
