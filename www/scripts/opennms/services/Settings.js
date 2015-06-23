(function() {
	'use strict';

	/* global moment: true */
	/* global cordova: true */
	/* global ionic: true */

	angular.module('opennms.services.Settings', [
		'ionic',
		'angularLocalStorage',
		'uuid4',
		'opennms.services.BuildConfig',
	])
	.provider('angularLocalStorageStore', function AngularLocalStorageStoreProvider() {
		var prefix = 'opennms.insecureStore.';

		this.setPrefix = function SetPrefix(p) {
			prefix = p;
		};

		this.$get = function angularLocalStorageStoreFactory($q, storage) {
			var doSet = function(key, value) {
				storage.set(prefix + key, value);
				return $q.when(value);
			};
			var doGet = function(key) {
				return $q.when(storage.get(prefix + key));
			};
			var doRemove = function(key) {
				var oldValue = storage.get(prefix + key);
				storage.remove(prefix + key);
				return $q.when(oldValue);
			};

			return {
				set: doSet,
				get: doGet,
				remove: doRemove,
				isAvailable: function() {
					return $q.when(true);
				},
			};
		};
	})
	.provider('angularSecureStore', function AngularSecureStoreProvider() {
		var prefix = 'angular-app';

		this.setPrefix = function SetPrefix(p) {
			prefix = p;
		};

		this.$get = function angularSecureStoreFactory($q, $rootScope, $window, $ionicPlatform) {
			var secureStore = $q.defer();

			$ionicPlatform.ready(function() {
				if (!ionic.Platform.isWebView() && $window.cordova && $window.cordova.plugins && $window.cordova.plugins.SecureStorage) {
					console.log('settings.angularSecureStore: Secure store not available.');
					secureStore.reject('No Cordova!');
				} else {
					try {
						var ss = new $window.cordova.plugins.SecureStorage(function(blah) {
							$rootScope.$evalAsync(function() {
								console.log('settings.angularSecureStore: Configured secure store.');
								secureStore.resolve(ss);
							});
						}, function(err) {
							$rootScope.$evalAsync(function() {
								console.log('settings.angularSecureStore: Failed to configure secure store.');
								secureStore.reject(err);
							});
						}, prefix);
					} catch (err) {
						$rootScope.$evalAsync(function() {
							console.log('settings.angularSecureStore: Failed to configure secure store.');
							secureStore.reject(err);
						});
					}
				}
			});

			var doSet = function(key, value) {
				var deferred = $q.defer();

				if (value === null) {
					value = undefined;
				}
				if (value !== undefined) {
					value = angular.toJson(value);
				}
				var _reject = function(err) {
					$rootScope.$evalAsync(function() {
						deferred.reject(err);
					});
				};

				secureStore.promise.then(function(ss) {
					console.log('ss='+ss);
					ss.set(function(key) {
						$rootScope.$evalAsync(function() {
							deferred.resolve(value);
						});
					}, _reject, key, value);
				}, _reject);

				return deferred.promise;
			};

			var doGet = function(key) {
				var deferred = $q.defer();

				var _reject = function(err) {
					$rootScope.$evalAsync(function() {
						deferred.reject(err);
					});
				};

				secureStore.promise.then(function(ss) {
					ss.get(function(value) {
						$rootScope.$evalAsync(function() {
							if (value === null) {
								value = undefined;
							}
							if (value !== undefined) {
								value = angular.fromJson(value);
							}
							deferred.resolve(value);
						});
					}, _reject, key);
				}, _reject);

				return deferred.promise;
			};

			var doRemove = function(key) {
				var deferred = $q.defer();

				var _reject = function(err) {
					$rootScope.$evalAsync(function() {
						deferred.reject(err);
					});
				};

				secureStore.promise.then(function(ss) {
					doGet(key).then(function(value) {
						ss.remove(function(key) {
							$rootScope.$evalAsync(function() {
								deferred.resolve(value);
							});
						}, _reject, key);
					}, _reject);
				}, _reject);

				return deferred.promise;
			};

			return {
				set: doSet,
				get: doGet,
				remove: doRemove,
				isAvailable: function() {
					return secureStore.promise.then(function() {
						return true;
					}, function(err) {
						return false;
					});
				},
			};
		};
	})
	.config(function(angularSecureStoreProvider) {
		angularSecureStoreProvider.setPrefix('opennms.secureStore');
	})
	.factory('secureStore', function($q, angularSecureStore, angularLocalStorageStore) {
		var backend = $q.defer();
		var keys = [];

		angularSecureStore.isAvailable().then(function(isAvailable) {
			if (isAvailable) {
				console.log('Settings.secureStore: angularSecureStore is available, using it.');
				backend.resolve(angularSecureStore);
			} else {
				console.log('Settings.secureStore: angularSecureStore is not available, falling back to local storage.');
				 backend.resolve(angularLocalStorageStore);
			}
		});

		var _saveKeys = function(_keys) {
			console.log('secureStore._saveKeys: ' + angular.toJson(_keys));
			return backend.promise.then(function(store) {
				return store.set('___opennms.keys___', _keys);
			});
		};

		var _addKey = function(key) {
			console.log('secureStore._addKey: ' + key);
			if (keys.indexOf(key) !== -1) {
				// no-op
				return $q.when(keys);
			} else {
				keys.push(key);
				return backend.promise.then(function(store) {
					return store._saveKeys(keys);
				});
			}
		};

		var _removeKey = function(key) {
			console.log('secureStore._removeKey: ' + key);
			var index = keys.indexOf(key);
			if (index === -1) {
				// no-op
				return $q.when(keys);
			} else {
				keys.splice(index, 1);
				return backend.promise.then(function(store) {
					return store._saveKeys(keys);
				});
			}
		};

		var getValue = function(key) {
			console.log('secureStore.getValue: ' + key);
			return backend.promise.then(function(store) {
				return store.get(key);
			});
		};

		var setValue = function(key, value) {
			console.log('secureStore.setValue: ' + key + '=' + angular.toJson(value));
			return backend.promise.then(function(store) {
				return store.set(key, value).then(function() {
					return _addKey(key).then(function() {
						return value;
					});
				});
			});
		};

		var removeKey = function(key) {
			console.log('secureStore.removeKey: ' + key);
			return backend.promise.then(function(store) {
				return store.remove(key).then(function(value) {
					return _removeKey(key).then(function() {
						return value;
					});
				});
			});
		};

		var getKeys = function() {
			console.log('secureStore.getKeys');
			return backend.promise.then(function(store) {
				return store.get('___opennms.keys___').then(function(k) {
					console.log('secureStore.getKeys: keys = ' + angular.toJson(k));
					if (k === undefined) {
						k = [];
					}
					return k;
				}, function() {
					return [];
				});
			});
		};

		getKeys().then(function(k) {
			keys = k;
		});

		return {
			get: getValue,
			set: setValue,
			remove: removeKey,
			keys: getKeys,
		};
	})
	.factory('Settings', function($q, $rootScope, $injector, secureStore, uuid4) {
		var $scope = $rootScope.$new();

		var defaultRestLimit = 100;
		var defaultRefreshInterval = 30000;
		var defaultShowAds = true;

		var serverTypeMatch = /^([Hh][Tt][Tt][Pp][Ss]?)\:/g;

		var getSettings = function() {
			var deferred = $q.defer();

			console.log('Settings.getSettings');
			secureStore.keys(function(keys) {
				console.log('Settings.getSettings: keys = ' + angular.toJson(keys));

				var p = [];
				for (var i=0; i < keys.length; i++) {
					p.push(secureStore.get(keys[i]));
				}
				$q.all(p).then(function(values) {
					var ret = {};
					for (var j=0; j < keys.length; j++) {
						ret[keys[j]] = values[j];
					}

					if (!ret.restLimit) {
						ret.restLimit = defaultRestLimit;
					}
					if (!ret.refreshInterval || isNaN(parseInt(ret.refreshInterval, 10))) {
						ret.refreshInterval = defaultRefreshInterval;
					}
					if (ret.showAds === undefined || ret.showAds === 'undefined') {
						ret.showAds = defaultShowAds;
					}

					deferred.resolve(ret);
				}, function(err) {
					deferred.reject(err);
				});
			}, function(err) {
				console.log('Settings.getSettings: failed to get keys: ' + angular.toJson(err));
				deferred.reject(err);
			});

			return deferred.promise;
		};
		var saveSettings = function(settings) {
			if (!settings) {
				console.log('Settings.saveSettings: ERROR: no settings provided.');
				return false;
			}

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
				settings.showAds = defaultShowAds;
			}
			if (settings.restLimit === undefined || settings.restLimit === 'undefined') {
				settings.restLimit = defaultRestLimit;
			}

			if (settings.refreshInterval === undefined || settings.refreshInterval === 'undefined') {
				settings.refreshInterval = defaultRefreshInterval;
			} else {
				settings.refreshInterval =  parseInt(settings.refreshInterval, 10);
				if (isNaN(settings.refreshInterval)) {
					settings.refreshInterval = defaultRefreshInterval;
				}
			}

			getSettings().then(function(oldSettings) {
				var changedSettings = {}, prop;

				var newSettings = angular.copy(settings);

				for (prop in newSettings) {
					if (newSettings.hasOwnProperty(prop) && newSettings[prop] !== oldSettings[prop]) {
						changedSettings[prop] = newSettings[prop];
					}
				}
				for (prop in oldSettings) {
					if (oldSettings.hasOwnProperty(prop) && oldSettings[prop] !== newSettings[prop]) {
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

					var promises = [];

					for (prop in changedSettings) {
						if (changedSettings.hasOwnProperty(prop)) {
							if (changedSettings[prop] === undefined) {
								promises.push(secureStore.remove(prop));
							} else {
								promises.push(secureStore.set(prop, changedSettings[prop]));
							}
						}
					}

					$q.all(promises).then(function() {
						// finished setting all properties
						if (changedSettings.server) {
							var match = serverTypeMatch.exec(changedSettings.server);
							if (match && match.length > 0) {
								$rootScope.$broadcast('opennms.analytics.trackEvent', 'settings', 'serverType', 'Server Type', match[0]);
							}
						}
						$rootScope.$broadcast('opennms.settings.updated', newSettings, oldSettings, changedSettings);
					}, function(err) {
						console.log('Settings.saveSettings: failed to save settings: ' + angular.toJson(err));
					});
				}

			});
		};

		secureStore.get('uuid').then(function(uuid) {
			if (!uuid || !uuid4.validate(uuid)) {
				secureStore.set('uuid', uuid4.generate());
			}
		}, function() {
			secureStore.set('uuid', uuid4.generate());
		});

		return {
			get: getSettings,
			set: saveSettings,
			getServerName: function() {
				return secureStore.get('server').then(function(server) {
					if (server) {
						var a = document.createElement('a');
						a.href = server;
						return a.hostname;
					} else {
						return undefined;
					}
				});
			},
			restLimit: function() {
				return secureStore.get('restLimit');
			},
			refreshInterval: function() {
				return secureStore.get('refreshInterval').then(function(refresh) {
					refresh = parseInt(refresh, 10);
					if (isNaN(refresh) || refresh === 0) {
						refresh = defaultRefreshInterval;
					}
					return refresh;
				});
			},
			URL: function() {
				return secureStore.get('server');
			},
			restURL: function() {
				return secureStore.get('server').then(function(server) {
					if (server) {
						server += 'rest/';
					}
					return server;
				});
			},
			showAds: function() {
				return secureStore.get('showAds');
			},
			username: function() {
				return secureStore.get('username');
			},
			password: function() {
				return secureStore.get('password');
			},
			uuid: function() {
				return secureStore.get('uuid');
			},
			disableAds: function() {
				return getSettings().then(function(settings) {
					settings.showAds = false;
					return saveSettings(settings);
				});
			},
			isServerConfigured: function() {
				return getSettings().then(function(settings) {
					return (settings.server && settings.username && settings.password);
				});
			},
			version: function() {
				return $q.when($injector.get('config.build.version'));
			},
			build: function() {
				return $q.when($injector.get('config.build.build'));
			}
		};
	});
}());
