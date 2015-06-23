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
		'uuid4',
		'opennms.services.BuildConfig',
		'opennms.services.Config',
	])
	.factory('Settings', function($q, $rootScope, $injector, storage, uuid4) {
		var $scope = $rootScope.$new();

		$scope.settings = storage.get('opennms.settings');

		var getSettings = function() {
			return $q.when(angular.copy($scope.settings));
		};
		var saveSettings = function(settings) {
			if (!settings) {
				return $q.reject('Settings.saveSettings: ERROR: no settings provided.');
			}

			var serverTypeMatch = new RegExp('^([Hh][Tt][Tt][Pp][Ss]?):');
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

				if (changedSettings.server) {
					var match = serverTypeMatch.exec(changedSettings.server);
					if (match && match.length > 0) {
						$rootScope.$broadcast('opennms.analytics.trackEvent', 'settings', 'serverType', 'Server Type', match[0]);
					}
				}
				$rootScope.$broadcast('opennms.settings.updated', newSettings, oldSettings, changedSettings);
			}

			return $q.when($scope.settings);
		};

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
		if (!$scope.settings.uuid) {
			$scope.settings.uuid = uuid4.generate();
			// no uuid? save it immediately
			saveSettings(getSettings());
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

		var _getServerName = function() {
			return getSettings().then(function(settings) {
				var server = getSettings().server;
				if (server) {
					var a = document.createElement('a');
					a.href = server;
					return a.hostname;
				}
				return undefined;
			});
		};

		var _getRestLimit = function() {
			return getSettings().then(function(settings) {
				return settings.restLimit;
			});
		};

		var _url = function(fragment) {
			return getSettings().then(function(settings) {
				var url = settings.server;
				if (url) {
					if (!url.endsWith('/')) {
						url += '/';
					}
					if (fragment) {
						url += fragment;
					}
				}
				return url;
			});
		};

		var _restUrl = function() {
			return _url().then(function(url) {
				if (url) {
					if (!url.endsWith('/')) {
						url += '/';
					}
					url += 'rest/';
					return url;
				} else {
					return undefined;
				}
			});
		};

		var _showAds = function() {
			return getSettings().then(function(settings) {
				return settings.showAds;
			});
		};

		var _username = function() {
			return getSettings().then(function(settings) {
				return settings.username;
			});
		};

		var _password = function() {
			return getSettings().then(function(settings) {
				return settings.password;
			});
		};

		var _uuid = function() {
			return getSettings().then(function(settings) {
				return settings.uuid;
			});
		};

		var _disableAds = function() {
			return getSettings().then(function(settings) {
				settings.showAds = false;
				return saveSettings(settings);
			});
		};

		var _isServerConfigured = function() {
			return getSettings().then(function(settings) {
				return (settings.server && settings.username && settings.password);
			});
		};

		var _version = function() {
			return $q.when($injector.get('config.build.version'));
		};

		var _build = function() {
			return $q.when($injector.get('config.build.build'));
		};

		return {
			get: getSettings,
			set: saveSettings,
			getServerName: _getServerName,
			restLimit: _getRestLimit,
			URL: _url,
			restURL: _restUrl,
			showAds: _showAds,
			username: _username,
			password: _password,
			uuid: _uuid,
			disableAds: _disableAds,
			isServerConfigured: _isServerConfigured,
			version: _version,
			build: _build,
		};
	});
}());
