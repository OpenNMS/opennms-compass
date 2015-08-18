(function() {
	'use strict';

	/* global moment: true */

	angular.module('opennms.services.Settings', [
		'angularLocalStorage',
		'uuid4',
		'opennms.services.BuildConfig',
		'opennms.services.Storage',
	])
	.value('default-graph-min-range', 7 * 24 * 60 * 60 * 1000) // 1 week
	.value('default-graph-range', 24 * 60 * 60 * 1000) // 1 day
	.factory('Settings', function($q, $rootScope, $injector, storage, uuid4, StorageService) {
		var $scope = $rootScope.$new();

		var defaultRestLimit = 100;
		var defaultRefreshInterval = 10000;

		var isEmpty = function(v) {
			return !!(angular.isUndefined(v) || v === '' || v === 'undefined' || v === null);
		};

		var ready = $q.defer();

		var isReady = function() {
			var deferred = $q.defer();
			ready.promise.then(function(r) {
				deferred.resolve(r);
			}, function(err) {
				deferred.resolve(false);
			});
			return deferred.promise;
		};

		var storeSettings = function(settings) {
			storage.set('opennms.settings', settings);
			return StorageService.save('default-server.json', {defaultServerName:settings.defaultServerName}, true).then(function() {
				// if we successfully saved the default server to a separate file, don't include it in settings
				var savedSettings = angular.copy(settings);
				delete savedSettings.defaultServerName;
				return StorageService.save('settings.json', savedSettings).then(function() {
					return settings;
				});
			}, function(err) {
				// otherwise, just fall back to the default behavior
				return StorageService.save('settings.json', settings).then(function() {
					return settings;
				});
			});
		};

		var convertOldSettings = function() {
			console.log('Settings.convertSettings: WARNING: attempting to convert settings from old location.');
			var settings = storage.get('opennms.settings');
			if (isEmpty(settings)) {
				settings = {};
			}
			return settings;
		};

		var getSettings = function() {
			return isReady().then(function() {
				return StorageService.load('settings.json').then(function(settings) {
					return StorageService.load('default-server.json', true).then(function(result) {
						if (result && result.defaultServerName) {
							settings.defaultServerName = result.defaultServerName;
						} else {
							delete settings.defaultServerName;
						}
						return settings;
					}, function(err) {
						return settings;
					});
				});
			}).then(function(settings) {
				if (isEmpty(settings)) {
					return $q.reject('No settings found.');
				} else {
					return settings;
				}
			}, function(err) {
				return {};
			});
		};

		var init = function() {
			console.log('Settings.init: Initializing.');
			return StorageService.load('settings.json').then(function(settings) {
				//console.log('Settings.init: loaded settings.json');
				if (isEmpty(settings)) {
					return $q.reject('No settings found.');
				} else {
					return settings;
				}
			}, function(err) {
				console.log('Settings.init: Converting old settings.');
				return convertOldSettings();
			}).then(function(settings) {
				if (!settings || settings === 'undefined') {
					settings = {};
				}

				if (settings.defaultServerName) {
					delete settings.server;
					delete settings.username;
					delete settings.password;
				} else {
					settings.defaultServerName = undefined;

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

				//console.log('Settings.init: storing final settings: ' + angular.toJson(settings, true));
				return storeSettings(settings).then(function() {
					//console.log('Settings.init: finished storing final settings.');
					ready.resolve(true);
					return settings;
				}, function(err) {
					console.log('Settings.init: failed to store final settings: ' + angular.toJson(err));
					ready.resolve(false);
					return $q.reject(err);
				});
			});
		};

		var saveSettings = function(settings) {
			if (!settings) {
				return $q.reject('Settings.saveSettings: ERROR: no settings provided.');
			}

			var serverTypeMatch = new RegExp('^([Hh][Tt][Tt][Pp][Ss]?):');
			var changedSettings = {};

			if (isEmpty(settings.defaultServerName)) {
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
				var newSettings = angular.copy(settings), prop;

				if (!oldSettings) {
					oldSettings = {};
				}

				for (prop in newSettings) {
					if (newSettings.hasOwnProperty(prop) && newSettings[prop] !== oldSettings[prop]) {
						changedSettings[prop] = newSettings[prop];
					}
				}
				for (prop in oldSettings) {
					if (oldSettings.hasOwnProperty(prop) && !newSettings.hasOwnProperty(prop)) {
						changedSettings[prop] = undefined;
					}
				}

				var o = angular.toJson(oldSettings),
					n = angular.toJson(newSettings),
					c = angular.toJson(changedSettings);

				if (c === "{}") {
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

		init();

		var _getDefaultServerName = function() {
			return getSettings().then(function(settings) {
				if (settings && angular.isDefined(settings.defaultServerName)) {
					return settings.defaultServerName;
				} else if (settings && angular.isDefined(settings.server)) {
					var server = settings.server;
					if (server) {
						var a = document.createElement('a');
						a.href = server;
						return a.hostname;
					}
				} else {
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

		var _showAds = function() {
			return getSettings().then(function(settings) {
				return settings.showAds;
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

		var _version = function() {
			return $q.when($injector.get('config.build.version'));
		};

		var _build = function() {
			return $q.when($injector.get('config.build.build'));
		};

		var _refreshInterval = function() {
			return getSettings().then(function(settings) {
				return settings.refreshInterval;
			});
		};

		return {
			get: getSettings,
			set: saveSettings,
			getDefaultServerName: _getDefaultServerName,
			setDefaultServerName: _setDefaultServerName,
			refreshInterval: _refreshInterval,
			restLimit: _getRestLimit,
			showAds: _showAds,
			uuid: _uuid,
			disableAds: _disableAds,
			version: _version,
			build: _build,
		};
	});
}());
