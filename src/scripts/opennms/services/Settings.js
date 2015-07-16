(function() {
	'use strict';

	/* global moment: true */

	angular.module('opennms.services.Settings', [
		'angularLocalStorage',
		'uuid4',
		'opennms.services.BuildConfig',
		'opennms.services.Storage',
	])
	.factory('Settings', function($q, $rootScope, $injector, storage, uuid4, StorageService) {
		var $scope = $rootScope.$new();

		var defaultRestLimit = 100;
		var defaultRefreshInterval = 30000;

		var isEmpty = function(v) {
			return !!(angular.isUndefined(v) || v === '' || v === 'undefined');
		};

		var storeSettings = function(settings) {
			storage.set('opennms.settings', settings);
			return StorageService.save('settings.json', settings).then(function() {
				return settings;
			});
		};

		var upgradeSettings = function() {
			console.log('Settings.upgradeSettings: WARNING: attempting to upgrade settings from old location.');
			var settings = storage.get('opennms.settings');
			if (isEmpty(settings)) {
				settings = {};
			}
			return storeSettings(settings).then(function() {
				return settings;
			});
		};

		var getSettings = function() {
			return StorageService.load('settings.json').then(function(settings) {
				if (isEmpty(settings)) {
					return upgradeSettings();
				} else {
					return settings;
				}
			}, function(err) {
				return upgradeSettings();
			});
		};

		var saveSettings = function(settings) {
			if (!settings) {
				return $q.reject('Settings.saveSettings: ERROR: no settings provided.');
			}

			var serverTypeMatch = new RegExp('^([Hh][Tt][Tt][Pp][Ss]?):');
			var changedSettings = {};

			if (!settings.defaultServerName || settings.defaultServerName === 'undefined' || settings.defaultServerName === '') {
				settings.defaultServerName = undefined;
			}

			if (settings.defaultServerName) {
				delete settings.server;
				delete settings.username;
				delete settings.password;
			} else {
				// obsolete
				if (isEmpty(settings.server)) {
					settings.server = undefined;
				}
				if (settings.server && !settings.server.endsWith('/')) {
					settings.server += '/';
				}

				if (isEmpty(settings.username)) {
					settings.username = undefined;
				}

				if (isEmpty(settings.password)) {
					settings.password = undefined;
				}
			}

			if (angular.isUndefined(settings.showAds) || settings.showAds === 'undefined') {
				settings.showAds = true;
			}
			if (angular.isUndefined(settings.refreshInterval) || settings.refreshInterval === 'undefined') {
				settings.refreshInterval = undefined;
			} else {
				settings.refreshInterval =  parseInt(settings.refreshInterval, 10);
				if (isNaN(settings.refreshInterval)) {
					settings.refreshInterval = defaultRefreshInterval;
				}
			}

			return getSettings().then(function(oldSettings) {
				var newSettings = angular.copy(settings);

				if (!oldSettings) {
					oldSettings = {};
				}

				for (var prop in newSettings) {
					if (newSettings.hasOwnProperty(prop) && newSettings[prop] !== oldSettings[prop]) {
						changedSettings[prop] = newSettings[prop];
					}
				}

				var o = angular.toJson(oldSettings),
					n = angular.toJson(newSettings);

				if (o === n) {
					//console.log('Settings.saveSettings: settings are unchanged.');
					return oldSettings;
				} else {
					console.log('Settings.saveSettings: settings have changed.  Updating.');
					console.log('Settings.saveSettings: Old Settings: ' + o);
					console.log('Settings.saveSettings: New Settings: ' + n);

					return storeSettings(newSettings).then(function(stored) {
						if (changedSettings.server) {
							var match = serverTypeMatch.exec(changedSettings.server);
							if (match && match.length > 0) {
								$rootScope.$broadcast('opennms.analytics.trackEvent', 'settings', 'serverType', 'Server Type', match[0]);
							}
						}
						$rootScope.$broadcast('opennms.settings.updated', newSettings, oldSettings, changedSettings);
						return stored;
					});
				}
			});
		};

		getSettings().then(function(settings) {
			if (!settings || settings === 'undefined') {
				settings = {};
			}

			if (!settings.defaultServerName) {
				settings.defaultServerName = undefined;
			}

			if (settings.defaultServerName) {
				delete settings.server;
				delete settings.username;
				delete settings.password;
			} else {
				// obsolete
				if (!settings.server) {
					settings.server = undefined;
				}
				if (!settings.username) {
					settings.username = undefined;
				}
				if (!settings.password) {
					settings.password = undefined;
				}
			}

			if (!settings.uuid) {
				settings.uuid = uuid4.generate();
			}
			if (!settings.restLimit) {
				settings.restLimit = defaultRestLimit;
			}
			if (!settings.refreshInterval || isNaN(parseInt(settings.refreshInterval, 10))) {
				settings.refreshInterval = defaultRefreshInterval;
			}
			if (angular.isUndefined(settings.showAds) || settings.showAds === 'undefined') {
				settings.showAds = true;
			}
			saveSettings(settings);
		});

		var _getDefaultServerName = function() {
			return getSettings().then(function(settings) {
				if (settings.defaultServerName) {
					return settings.defaultServerName;
				} else {
					var server = settings.server;
					if (server) {
						var a = document.createElement('a');
						a.href = server;
						return a.hostname;
					}
					return undefined;
				}
			});
		};

		var _setDefaultServerName = function(name) {
			return getSettings().then(function(settings) {
				settings.defaultServerName = name;
				return saveSettings(settings);
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
						if (fragment.startsWith('/')) {
							fragment = fragment.slice(1);
						}
						url += fragment;
					}
				}
				return url;
			});
		};

		var _restUrl = function(fragment) {
			return _url('rest/').then(function(url) {
				if (fragment) {
					if (fragment.startsWith('/')) {
						fragment = fragment.slice(1);
					}
					url += fragment;
				}
				return url;
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

		var _rest = function(fragment) {
			return _restUrl(fragment).then(function(url) {
				return getSettings().then(function(settings) {
					return {
						url: url,
						username: settings.username,
						password: settings.password,
					};
				});
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
				if (settings.server && settings.username && settings.password) {
					return true;
				} else {
					return false;
				}
			}, function(err) {
				return false;
			});
		};

		var _version = function() {
			return $q.when($injector.get('config.build.version'));
		};

		var _build = function() {
			return $q.when($injector.get('config.build.build'));
		};

		var _server = function() {
			return getSettings().then(function(settings) {
				return {
					name: 'default',
					url: settings.server,
					username: settings.username,
					password: settings.password,
				};
			});
		};

		return {
			get: getSettings,
			set: saveSettings,
			getDefaultServerName: _getDefaultServerName,
			setDefaultServerName: _setDefaultServerName,
			restLimit: _getRestLimit,
			/*
			restURL: _restUrl,
			*/
			showAds: _showAds,
			/*
			username: _username,
			password: _password,
			server: _server,
			rest: _rest,
			*/
			uuid: _uuid,
			disableAds: _disableAds,
			isServerConfigured: _isServerConfigured,
			version: _version,
			build: _build,
		};
	});
}());
