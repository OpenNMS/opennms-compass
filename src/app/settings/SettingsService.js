(function() {
	'use strict';

	var DB_NAME = 'settings';

	var angular = require('angular'),
		moment = require('moment');

	var Constants = require('../misc/Constants');

	require('../../../generated/misc/BuildConfig');

	require('../db/db');
	require('../misc/Analytics');

	angular.module('opennms.services.Settings', [
		'angularLocalStorage',
		'uuid4',
		'opennms.services.BuildConfig',
		'opennms.services.DB'
	])
	.value('default-graph-min-range', Constants.DEFAULT_GRAPH_MIN_RANGE)
	.value('default-graph-range', Constants.DEFAULT_GRAPH_RANGE)
	.factory('Settings', function($q, $rootScope, $injector, $log, storage, db, uuid4) {
		var $scope = $rootScope.$new();

		var defaultSettings = {
			enableAnalytics: true
		};

		var settingsDB = db.get(DB_NAME);
		var getAllSettings = function() {
			return db.all(DB_NAME).then(function(docs) {
				return docs.filter(function(doc) {
					return doc.setting;
				});
			}).then(function(docs) {
				var ret = {};
				for (var i=0, len=docs.length, doc; i < len; i++) {
					doc = docs[i];
					ret[doc._id] = doc.value;
				}
				return ret;
			});
		};

		var _get = function(key) {
			return settingsDB.get(key).then(function(doc) {
				return doc.value;
			}).catch(function(err) {
				if (err.status === Constants.HTTP_NOT_FOUND) {
					return undefined;
				}
				return $q.reject(err);
			});
		};

		var _set = function(key, value) {
			return db.upsert(DB_NAME, {
				_id: key,
				setting: true,
				value: value
			});
		};

		var _remove = function(key) {
			return db.remove(DB_NAME, key);
		};

		var isEmpty = function(v) {
			return Boolean(angular.isUndefined(v) || v === '' || v === 'undefined' || v === null);
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

			var promises = [];
			for (var key in saveme) {
				if (saveme[key] === undefined) {
					promises.push(_remove(key));
				} else {
					promises.push(_set(key, saveme[key]))
				}
			}

			return $q.all(promises).then(function() {
				return settings;
			}).catch(function(err) {
				$log.warn('Failed to save settings: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var storeSettings = function(settings) {
			return isReady().then(function() {
				return _saveSettings(settings);
			});
		};

		var _loadSettings = function() {
			return getAllSettings().then(function(settings) {
				return settings;
			}).catch(function(err) {
				if (err.status === Constants.HTTP_NOT_FOUND) {
					return angular.copy(defaultSettings);
				}
				return $q.reject(err);
			}).then(function(settings) {
				var defaultServerId = storage.get('opennms.default-server-id');

				if (!isEmpty(defaultServerId)) {
					settings.defaultServerId = defaultServerId;
				}
				if (settings.enableAnalytics === undefined || settings.enableAnalytics === null) {
					settings.enableAnalytics = true;
				}

				if (__DEVELOPMENT__) { $log.debug('Settings._loadSettings: ' + angular.toJson(settings)); }
				return settings;
			});
		};

		var getSettings = function() {
			return isReady().then(function() {
				return _loadSettings();
			}).then(function(settings) {
				if (isEmpty(settings)) {
					return $q.reject('No settings found.');
				}
				return settings;
			}).catch(function(err) {
				$log.warn('Unable to get settings: ' + angular.toJson(err));
				return {};
			});
		};

		var init = function() {
			$log.info('Settings.init: Initializing.');

			return db.all(DB_NAME).then(function(docs) {
				if (docs.length > 0) {  //eslint-disable-line no-magic-numbers
					return ready.resolve(true);
				}

				var oldSettings = storage.get('opennms.settings') || {};

				if (!oldSettings.uuid) {
					oldSettings.uuid = uuid4.generate();
				}
				if (!oldSettings.restLimit) {
					oldSettings.restLimit = Constants.DEFAULT_REST_LIMIT;
				}
				if (!oldSettings.refreshInterval) {
					oldSettings.refreshInterval = Constants.DEFAULT_REFRESH_INTERVAL;
				}
				if (!oldSettings.hasOwnProperty('enableAnalytics')) {
					oldSettings.enableAnalytics = true;
				}

				var promises = [];
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
							if (value !== undefined && value !== null) {
								promises.push(_set(key, value));
							}
						}
					}
				}

				return $q.all(promises).catch(function(err) {
					$log.warn('Failed to convert old settings: ' + angular.toJson(err));
					return $q.reject(err);
				}).finally(function() {
					storage.remove('opennms.settings');
					return ready.resolve(true);
				});
			});
		};

		var saveSettings = function(settings) {
			if (!settings) {
				return $q.reject('Settings.saveSettings: ERROR: no settings provided.');
			}

			var changedSettings = {};

			if (isEmpty(settings.defaultServerId)) {
				settings.defaultServerId = undefined;
			}

			if (settings.defaultServerId) {
				delete settings.server;
				delete settings.username;
				delete settings.password;
			}

			if (settings.enableAnalytics === undefined || settings.enableAnalytics === null) {
				settings.enableAnalytics = true;
			}

			if (isEmpty(settings.refreshInterval) || settings.refreshInterval === 'undefined') {
				settings.refreshInterval = undefined;
			} else {
				settings.refreshInterval =  parseInt(settings.refreshInterval, 10);
				if (isNaN(settings.refreshInterval)) {
					settings.refreshInterval = defaultRefreshInterval;
				}
			}

			return getSettings().then(function(_oldSettings) {
				var oldSettings = _oldSettings || {},
					newSettings = angular.copy(settings),
					prop;

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
					//if (__DEVELOPMENT__) { $log.debug('Settings.saveSettings: settings are unchanged.'); }
 					return oldSettings;
 				}

				$log.debug('Settings.saveSettings: settings have changed.  Updating.');
				if (__DEVELOPMENT__) {
					/*
					$log.debug('Settings.saveSettings: Old Settings: ' + o);
					$log.debug('Settings.saveSettings: New Settings: ' + n);
					*/
					$log.debug('Settings.saveSettings: Changed Settings: ' + angular.toJson(c));
				}

				return storeSettings(newSettings).then(function(stored) {
					$rootScope.$broadcast('opennms.settings.updated', newSettings, oldSettings, changedSettings);
					return stored;
				}, function(err) {
					$log.error('SettingsService.saveSettings: Failed to save settings: ' + angular.toJson(err));
					if (err.message) {
						$log.error(err.message);
					}
				});
			});
		};

		init();

		var _getDefaultServerId = function() {
			return $q.when(storage.get('opennms.default-server-id') || undefined);
		};

		var _setDefaultServerId = function(id) {
			return getSettings().then(function(settings) {
				settings.defaultServerId = id;
				return saveSettings(settings);
			});
		};

		var _getRestLimit = function() {
			return _get('restLimit').then(function(restLimit) {
				if (isEmpty(restLimit)) {
					return Constants.DEFAULT_REST_LIMIT;
				}
				return restLimit;
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

		function _isAnalyticsEnabled() {
			return _get('enableAnalytics');
		}

		function _enableAnalytics() {
			return getSettings().then(function(settings) {
				settings.enableAnalytics = true;
				return saveSettings(settings);
			});
		}

		function _disableAnalytics() {
			return getSettings().then(function(settings) {
				settings.enableAnalytics = false;
				return saveSettings(settings);
			});
		}

		var _refreshInterval = function() {
			return _get('refreshInterval').then(function(refreshInterval) {
				if (isEmpty(refreshInterval)) {
					return defaultRefreshInterval;
				}
				return refreshInterval;
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
			isAnalyticsEnabled: _isAnalyticsEnabled,
			enableAnalytics: _enableAnalytics,
			disableAnalytics: _disableAnalytics,
			version: _version,
			build: _build
		};
	});
}());
