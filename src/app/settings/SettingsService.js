(function() {
	'use strict';

	var DB_NAME = 'settings';

	var angular = require('angular'),
		moment = require('moment');

	require('../db/db');
	require('../misc/Analytics');
	require('../misc/BuildConfig');

	angular.module('opennms.services.Settings', [
		'angularLocalStorage',
		'uuid4',
		'opennms.services.BuildConfig',
		'opennms.services.DB'
	])
	.value('default-graph-min-range', 30 * 24 * 60 * 60 * 1000) // 1 month
	.value('default-graph-range', 24 * 60 * 60 * 1000) // 1 day
	.factory('Settings', function($q, $rootScope, $injector, $log, storage, db, uuid4) {
		var $scope = $rootScope.$new();

		var defaultRestLimit = 100;
		var defaultRefreshInterval = 10000;

		var settingsDB = db.get(DB_NAME);
		settingsDB.createIndex({
			index: {
				fields: ['key']
			}
		});

		var _get = function(key) {
			return settingsDB.find({
				selector: {key: key}
			}).then(function(result) {
				if (result && result.docs && result.docs.length === 1) {
					return result.docs[0].value;
				} else {
					return null;
				}
			}).catch(function(err) {
				return null;
			});
		};

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

		var _saveSettings = function(settings) {
			var saveme = angular.copy(settings);

			if (saveme.defaultServerId) {
				storage.set('opennms.default-server-id', saveme.defaultServerId);
			} else {
				storage.remove('opennms.default-server-id');
			}
			delete saveme.defaultServerId;

			db.find({
				selector: {name: {$gt: null}},
				sort: ['key']
			}).then(function(result) {
				var entries = result.docs;
				var existing = {};
				for (var i=0, len=entries.length, entry; i < len; i++) {
					entry = entries[i];
					existing[entry.key] = entry;
				}

				var newKeys = Object.keys(saveme),
					existingKeys = Object.keys(existing),
					deletedKeys = existingKeys.difference(newKeys);

				$log.debug('Settings._saveSettings: setting: ' + newKeys);
				$log.debug('Settings._saveSettings: deleting: ' + deletedKeys);

				var operations = [];

				for (var i=0, len=newKeys.length, key, entry; i < len; i++) {
					key = newKeys[i];
					if (key === 'defaultServerId') {
						continue;
					}

					entry = saveme[key];
					$log.debug('SettingsService: saving ' + angular.toJson(entry));
					if (existing[key]) {
						if (existing[key].value !== saveme[key].value) {
							entry = angular.extend({}, existing[key], saveme[key]);
							operations.push(settingsDB.put(entry));
						} else {
							$log.debug('SettingsService: * ' + key + ' has not changed');
						}
					} else {
						operations.push(settingsDB.post(entry));
					}
				}
				for (var i=0, len=deletedKeys.length, key; i < len; i++) {
					key = deletedKeys[i];
					operations.push(settingsDB.remove(existing[key]));
				}

				return $q.all(operations).then(function() {
					return settings;
				});
			});
		};

		var storeSettings = function(settings) {
			return isReady().then(function() {
				return _saveSettings(settings);
			});
		};

		var _loadSettings = function() {
			return settingsDB.find({
				selector: {key: {$gt: null}},
				sort: ['key']
			}).then(function(result) {
				var docs = result.docs;
				var settings = {},
					defaultServerId = storage.get('opennms.default-server-id');

				for (var i=0, len=docs.length, doc; i < len; i++) {
					doc = docs[i];
					settings[doc.key] = doc.value;
				}

				if (!isEmpty(defaultServerId)) {
					settings.defaultServerId = defaultServerId;
				}

				$log.debug('Settings._loadSettings: ' + angular.toJson(settings));
				return settings;
			});
		};

		var getSettings = function() {
			return isReady().then(function() {
				return _loadSettings();
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
			$log.info('Settings.init: Initializing.');

			return db.all(DB_NAME).then(function(docs) {
				if (docs.length > 0) {
					return ready.resolve(true);
				}

				var oldSettings = storage.get('opennms.settings') || {};

				if (!oldSettings.uuid) {
					oldSettings.uuid = uuid4.generate();
				}
				if (!oldSettings.restLimit) {
					oldSettings.restLimit = defaultRestLimit;
				}
				if (!oldSettings.refreshInterval) {
					oldSettings.refreshInterval = defaultRefreshInterval;
				}

				if (!isEmpty(oldSettings)) {
					var keys = Object.keys(oldSettings);
					for (var i=0, len=keys.length, key, value; i < len; i++) {
						key = keys[i];
						value = oldSettings[key];
						if (!isEmpty(value)) {
							if (key === 'refreshInterval' || key === 'restLimit') {
								value = parseInt(value, 10);
								if (isNaN(value)) {
									value = null;
								}
							}
							settingsDB.post({key:key,value:value});
						}
					}
				}
				storage.remove('opennms.settings');

				return ready.resolve(true);
			});
		};

		var saveSettings = function(settings) {
			if (!settings) {
				return $q.reject('Settings.saveSettings: ERROR: no settings provided.');
			}

			var serverTypeMatch = new RegExp('^([Hh][Tt][Tt][Pp][Ss]?):');
			var changedSettings = {};

			if (isEmpty(settings.defaultServerId)) {
				settings.defaultServerId = undefined;
			}

			if (settings.defaultServerId) {
				delete settings.server;
				delete settings.username;
				delete settings.password;
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

				if (c === '{}') {
					//$log.debug('Settings.saveSettings: settings are unchanged.');
					return oldSettings;
				} else {
					$log.debug('Settings.saveSettings: settings have changed.  Updating.');
					$log.debug('Settings.saveSettings: Old Settings: ' + o);
					$log.debug('Settings.saveSettings: New Settings: ' + n);

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

		var _getDefaultServerId = function() {
			return $q.when(storage.get('opennms.default-server-id') || undefined);
		};

		var _setDefaultServerId = function(id) {
			storage.set('opennms.default-server-id', id);
			return $q.when(id);
		};

		var _getRestLimit = function() {
			return _get('restLimit').then(function(restLimit) {
				if (angular.isUndefined(restLimit)) {
					return defaultRestLimit;
				} else {
					return restLimit;
				}
			});
		};

		var _uuid = function() {
			return _get('uuid');
		};

		var _version = function() {
			return $q.when($injector.get('config.build.version'));
		};

		var _build = function() {
			return $q.when($injector.get('config.build.build'));
		};

		var _refreshInterval = function() {
			return _get('refreshInterval').then(function(refreshInterval) {
				if (angular.isUndefined(refreshInterval)) {
					return defaultRefreshInterval;
				} else {
					return refreshInterval;
				}
			});
		};

		return {
			get: getSettings,
			set: saveSettings,
			getDefaultServerId: _getDefaultServerId,
			setDefaultServerId: _setDefaultServerId,
			refreshInterval: _refreshInterval,
			restLimit: _getRestLimit,
			uuid: _uuid,
			version: _version,
			build: _build
		};
	});
}());
