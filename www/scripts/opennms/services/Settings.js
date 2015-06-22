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
	.provider('angularSecureStore', function AngularSecureStoreProvider() {
		var prefix = 'angular-app';

		this.setPrefix = function SetPrefix(p) {
			prefix = p;
		};

		this.$get = function angularSecureStoreFactory($q, $rootScope, $window, $ionicPlatform) {
			var secureStore = $q.defer();

			$ionicPlatform.ready(function() {
				(function() {
					if (!ionic.Platform.isWebView() && $window.cordova && $window.cordova.plugins && $window.cordova.plugins.SecureStorage) {
						console.log('settings.angularSecureStore: Secure store not available.');
						secureStore.reject('No Cordova!');
					} else {
						try {
							var ss = new $window.cordova.plugins.SecureStorage(function() {
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
				}());
			});

			var doSet = function(key, value) {
				var deferred = $q.defer();

				if (value !== undefined) {
					value = angular.toJson(value);
				}
				var _reject = function(err) {
					$rootScope.$evalAsync(function() {
						deferred.reject(err);
					});
				};

				secureStore.promise.then(function(ss) {
					ss.set(function(key) {
						$rootScope.$evalAsync(function() {
							deferred.resolve(key);
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
					ss.remove(function(key) {
						$rootScope.$evalAsync(function() {
							deferred.resolve(key);
						});
					}, _reject, key);
				}, _reject);

				return deferred.promise;
			};

			return {
				set: doSet,
				get: doGet,
				remove: doRemove,
			};
		};
	})
	.config(function(angularSecureStoreProvider) {
		angularSecureStoreProvider.setPrefix('opennms.secureStore');
	})
	.factory('secureStore', function($q, $rootScope, $ionicPlatform, angularSecureStore, storage) {
		var keys = [];

		var _saveKeys = function(_keys) {
			var deferred = $q.defer();

			angularSecureStore.set('___opennms.keys___', _keys).then(function() {
				deferred.resolve(_keys);
			}, function(err) {
				// local storage doesn't need to do anything
				deferred.resolve(_keys);
			});

			return deferred.promise;
		};

		var _addKey = function(key) {
			if (keys.indexOf(key) !== -1) {
				// no-op
				var deferred = $q.defer();
				deferred.resolve(keys);
				return deferred.promise;
			} else {
				keys.push(key);
				return _saveKeys(keys);
			}
		};

		var _removeKey = function(key) {
			var index = keys.indexOf(key);
			if (index === -1) {
				// no-op
				var deferred = $q.defer();
				deferred.resolve(keys);
				return deferred.promise;
			} else {
				keys.splice(index, 1);
				return _saveKeys(keys);
			}
		};

		var getValue = function(key) {
			var deferred = $q.defer();
			angularSecureStore.get(key).then(function(value) {
				deferred.resolve(value);
			}, function(err) {
				// use local storage if secureStore is not available
				deferred.resolve(storage.get('opennms.insecureStore.' + key));
			});
			return deferred.promise;
		};

		var setValue = function(key, value) {
			var deferred = $q.defer();
			angularSecureStore.set(key, value).then(function() {
				_addKey(key).then(function() {
					deferred.resolve(value);
				}, function(err) {
					deferred.reject(err);
				});
			}, function(err) {
				// use local storage if secureStore is not available
				deferred.resolve(storage.set('opennms.insecureStore.' + key, value));
			});
			return deferred.promise;
		};

		var removeKey = function(key) {
			var deferred = $q.defer();
			// get the existing value
			angularSecureStore.get(key).then(function(value) {
				// remove it from the store
				angularSecureStore.remove(key).then(function(k) {
					// remove the key from the key cache
					_removeKey(key).then(function() {
						// return the old value
						deferred.resolve(value);
					}, function(err) {
						deferred.reject(err);
					});
				}, function(err) {
					deferred.reject(err);
				});
			}, function(err) {
				// use local storage if secureStore is not available
				deferred.resolve(storage.remove('opennms.insecureStore.' + key));
			});
			return deferred.promise;
		};

		var getKeys = function() {
			var deferred = $q.defer();
			angularSecureStore.get('___opennms.keys___').then(function(keys) {
				if (keys === undefined) {
					keys = [];
				}
				deferred.resolve(keys);
			}, function() {
				var keys = storage.getKeys();
				if (keys === undefined) {
					keys = [];
				}
				deferred.resolve(keys);
			});
			return deferred.promise;
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

			secureStore.keys(function(keys) {
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
							var match = serverTypeMatch.match(changedSettings.server);
							if (match.length > 0) {
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
			if (!uuid4.validate(uuid)) {
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
				return $injector.get('config.build.version');
			},
			build: function() {
				return $injector.get('config.build.build');
			}
		};
	});
}());
