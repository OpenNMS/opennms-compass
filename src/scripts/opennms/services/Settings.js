(function() {
	'use strict';

	/* global moment: true */

	angular.module('opennms.services.Settings', [
		'angularLocalStorage',
		'uuid4',
		'opennms.services.BuildConfig',
		'opennms.services.DB',
	])
	.value('default-graph-min-range', 7 * 24 * 60 * 60 * 1000) // 1 week
	.value('default-graph-range', 24 * 60 * 60 * 1000) // 1 day
	.factory('Settings', function($q, $rootScope, $injector, $log, storage, db, uuid4) {
		var $scope = $rootScope.$new();

		var defaultRestLimit = 100;
		var defaultRefreshInterval = 10000;

		var settingsDb = db.get('settings');
		var settingsCollection = settingsDb.getCollection('settings');
		if (!settingsCollection) {
			settingsCollection = settingsDb.addCollection('settings', {
				transactional: true,
			});
		}

		var _keys = function() {
			return settingsCollection.where(function() { return true; }).map(function(obj) {
				return obj.key;
			});
		};
		var _get = function(key) {
			//$log.debug('Settings._get: ' + key);
			var ret = settingsCollection.findObject({'key': key});
			if (ret && ret.hasOwnProperty('value')) {
				return ret.value;
			} else {
				return null;
			}
		};
		var _set = function(key, value) {
			//$log.debug('Settings._set: ' + key + '=' + value);
			var existing = settingsCollection.findObject({key: key});
			if (!existing) {
				settingsCollection.insert({key: key, value: value});
			} else {
				if (existing.value !== value) {
					existing.value = value;
					settingsCollection.update(existing);
				}
			}
		};
		var _delete = function(key) {
			$log.debug('Settings._delete: ' + key);
			settingsCollection.removeWhere({key:key});
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
			var newKeys = Object.keys(settings),
				deletedKeys = _keys().difference(newKeys),
				i, len;

			if (settings.defaultServerId) {
				storage.set('opennms.default-server-id', settings.defaultServerId);
			} else {
				storage.remove('opennms.default-server-id');
			}

			$log.debug('Settings._saveSettings: setting: ' + newKeys);
			$log.debug('Settings._saveSettings: deleting: ' + deletedKeys);

			for (i=0, len=newKeys.length; i < len; i++) {
				if (newKeys[i] === 'defaultServerId') {
					continue;
				}
				_set(newKeys[i], settings[newKeys[i]]);
			}
			for (i=0, len=deletedKeys.length; i < len; i++) {
				_delete(deletedKeys[i]);
			}

			return settings;
		};

		var storeSettings = function(settings) {
			return isReady().then(function() {
				return _saveSettings(settings);
			});
		};

		var _loadSettings = function() {
			$log.debug('Settings._loadSettings()');
			var settings = {},
				defaultServerId = storage.get('opennms.default-server-id'),
				keys = _keys(), i, len, value;

			if (!isEmpty(defaultServerId)) {
				settings.defaultServerId = defaultServerId;
			}

			for (i=0, len=keys.length; i < len; i++) {
				value = _get(keys[i]);
				if (value !== null) {
					settings[keys[i]] = value;
				}
			}

			$log.debug('Settings._loadSettings: ' + angular.toJson(settings));
			return settings;
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

			if (_get('restLimit')) {
				// the lokijs database is populated, we don't have to do anything
				return ready.resolve(true);
			}

			var oldSettings = storage.get('opennms.settings');
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
						_set(key, value);
					}
				}
			}
			storage.remove('opennms.settings');

			if (isEmpty(_get('uuid'))) {
				_set('uuid', uuid4.generate());
			}
			if (isEmpty(_get('restLimit'))) {
				_set('restLimit', defaultRestLimit);
			}
			if (isEmpty(_get('refreshInterval'))) {
				_set('refreshInterval', defaultRefreshInterval);
			}
			if (isEmpty(_get('showAds'))) {
				_set('showAds', true);
			}

			return ready.resolve(true);
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
				_delete('server');
				_delete('username');
				_delete('password');
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
			return $q.when(_get('defaultServerId') || undefined);
		};

		var _setDefaultServerId = function(id) {
			return $q.when(_set('defaultServerId', id)).then(function() {
				return id;
			});
		};

		var _getRestLimit = function() {
			return $q.when(_get('restLimit') || defaultRestLimit);
		};

		var _uuid = function() {
			return $q.when(_get('uuid'));
		};

		var _showAds = function() {
			var showAds = _get('showAds');
			if (isEmpty(showAds)) {
				showAds = true;
			}
			return $q.when(showAds);
		};

		var _disableAds = function() {
			_set('showAds', false);
			return $q.when(false);
		};

		var _version = function() {
			return $q.when($injector.get('config.build.version'));
		};

		var _build = function() {
			return $q.when($injector.get('config.build.build'));
		};

		var _refreshInterval = function() {
			return $q.when(_get('refreshInterval'));
		};

		return {
			get: getSettings,
			set: saveSettings,
			getDefaultServerId: _getDefaultServerId,
			setDefaultServerId: _setDefaultServerId,
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
