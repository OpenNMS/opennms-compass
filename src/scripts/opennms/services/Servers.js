(function() {
	'use strict';

	/* global cordova: true */
	/* global ionic: true */
	/* global moment: true */
	/* global Server: true */
	/* global URI: true */

	angular.module('opennms.services.Servers', [
		'ionic',
		'ngCordova',
		'uuid4',
		'opennms.services.Settings',
		'opennms.services.Storage',
		'opennms.services.Util',
	]).factory('Servers', function($q, $rootScope, $interval, $log, $timeout, uuid4, Settings, StorageService, UtilEventBroadcaster, UtilEventHandler) {
		$log.info('Servers: Initializing.');

		var ready = $q.defer();
		var fsPrefix = 'servers';
		var servers = [];
		var defaultServer;

		var isReady = function() {
			var deferred = $q.defer();
			ready.promise.then(function(r) {
				deferred.resolve(r);
			}, function(err) {
				deferred.resolve(false);
			});
			return deferred.promise;
		};

		var sortServers = function(a, b) {
			if (a && b) {
				return a.name.localeCompare(b.name);
			}
			return 0;
		};

		var checkServersUpdated = function(force) {
			var oldServers = angular.copy(servers);
			oldServers.sort(sortServers);
			return getServers().then(function(newServers) {
				newServers.sort(sortServers);
				servers = angular.copy(newServers);
				if (force === true || !angular.equals(oldServers, newServers)) {
					$log.debug('Servers.checkServersUpdated: server list has changed.');
					$log.debug('old: ' + angular.toJson(oldServers));
					$log.debug('new: ' + angular.toJson(newServers));
					UtilEventBroadcaster.serversUpdated(newServers, oldServers);
					$timeout(checkDefaultServerUpdated);
				}
				return newServers;
			});
		};

		var checkDefaultServerUpdated = function() {
			var oldDefaultServer = defaultServer;
			getDefaultServer().then(function(newDefaultServer) {
				defaultServer = newDefaultServer;
				if (!angular.equals(oldDefaultServer, newDefaultServer)) {
					UtilEventBroadcaster.defaultServerUpdated(newDefaultServer);
					UtilEventBroadcaster.dirty('all');
				}
			});
		};

		UtilEventHandler.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
			if (changedSettings && changedSettings.defaultServerName) {
				$timeout(checkServersUpdated);
			}
		});

		var refreshPromise;
		var startRefresh = function() {
			if (refreshPromise) {
				$interval.cancel(refreshPromise);
			}
			Settings.refreshInterval().then(function(refreshInterval) {
				refreshPromise = $interval(checkServersUpdated, refreshInterval);
			});
		};

		var fetchServerNames = function() {
			return StorageService.list(fsPrefix).then(function(entries) {
				//$log.debug('fetchServerNames: ' + angular.toJson(entries));
				var ret = [], i, len = entries.length;
				for (i=0; i < len; i++) {
					var filename = entries[i];
					var serverName = decodeURIComponent(filename.replace(/\.json$/, ''));
					ret.push(serverName);
				}
				ret.sort();
				return ret;
			}, function(err) {
				$log.error('Servers.fetchServerNames: WARNING: StorageService.list('+fsPrefix+') failed: ' + angular.toJson(err));
				return [];
			});
		};

		var saveServer = function(server) {
			if (!server.id) {
				server.id = uuid4.generate();
			}
			return StorageService.save(fsPrefix + '/' + encodeURIComponent(server.name) + '.json', server).then(function() {
				checkServersUpdated();
				return server;
			}, function(err) {
				$log.error('Servers.saveServer: WARNING: StorageService.save(' + server.name + ') failed: ' + angular.toJson(err));
				return undefined;
			});
		};

		var init = function() {
			return fetchServerNames().then(function(names) {
				if (names.length > 0) {
					return names;
				} else {
					$log.info('Servers.init: no server names found, attempting to upgrade old settings.');
					return Settings.get().then(function(settings) {
						$log.debug('Servers.init: settings = ' + angular.toJson(settings));
						if (settings.server !== undefined && settings.username !== undefined && settings.password !== undefined) {
							var server = new Server({
								name: URI(settings.server).hostname(),
								url: settings.server,
								username: settings.username,
								password: settings.password,
							});
							$log.debug('Servers.init: saving default server: ' + angular.toJson(server, true));
							return saveServer(server).then(function() {
								return server;
							});
						} else {
							$log.debug('Servers.init: No servers configured.');
							return $q.reject('No servers configured.');
						}
					}, function(err) {
						$log.info('Servers.init: No settings found.');
						return $q.reject(err);
					});
				}
			}).then(function() {
				ready.resolve(true);
				startRefresh();
				return ready.promise;
			}, function(err) {
				$log.error('Servers.init: failed initialization: ' + angular.toJson(err));
				ready.resolve(false);
				return ready.promise;
			});
		};

		var getServer = function(serverName) {
			var deferred = $q.defer();
			isReady().then(function() {
				return StorageService.load(fsPrefix + '/' + encodeURIComponent(serverName) + '.json').then(function(data) {
					if (!data.id) {
						data.id = uuid4.generate();
					}
					deferred.resolve(new Server(data));
				}, function(err) {
					deferred.resolve();
				});
			}, function(err) {
				$log.error('Servers.getServer: failed to get ' + serverName + ': ' + angular.toJson(err));
				deferred.resolve();
			});
			return deferred.promise;
		};

		var getServers = function() {
			return getServerNames().then(function(names) {
				var promises = [], i, len = names.length;
				promises.push(Settings.getDefaultServerName());
				for (i=0; i < len; i++) {
					promises.push(getServer(names[i]));
				}
				return $q.all(promises).then(function(servers) {
					//$log.debug('servers='+angular.toJson(servers));
					var defaultServerName = servers.shift(), ret = [];
					len = servers.length;
					for (i=0; i < len; i++) {
						//$log.debug('servers['+i+']='+angular.toJson(servers[i]));
						if (servers[i] === null || servers[i] === undefined) {
							continue;
						}
						servers[i].isDefault = (servers[i].name === defaultServerName);
						ret.push(servers[i]);
					}
					return ret;
				});
			}, function(err) {
				$log.error('Servers.getServers: failed: ' + angular.toJson(err));
				return [];
			});
		};

		var getServerNames = function() {
			return isReady().then(function() {
				return fetchServerNames();
			});
		};

		var getDefaultServer = function() {
			return isReady().then(function() {
				return Settings.getDefaultServerName().then(function(serverName) {
					//$log.debug('Servers.getDefaultServer: ' + serverName);
					if (serverName) {
						return getServer(serverName);
					} else {
						return $q.reject('No default server name.');
					}
				});
			}, function(err) {
				$log.error('Servers.getDefaultServer: failed: ' + angular.toJson(err));
				return undefined;
			});
		};

		var setDefaultServer = function(server) {
			var serverName = server.name? server.name:server;
			if (serverName) {
				return Settings.setDefaultServerName(serverName).then(function() {
					return checkServersUpdated();
				}).then(function() {
					return serverName;
				});
			} else {
				return $q.reject('Not sure how to handle server "'+server+'"');
			}
		};

		var putServer = function(server) {
			return isReady().then(function() {
				return saveServer(server);
			});
		};

		var doRemoveServer = function(server) {
			if (!server) {
				return $q.reject('No server to remove!');
			}
			return StorageService.remove(fsPrefix + '/' + encodeURIComponent(server.name) + '.json').then(function(ret) {
				UtilEventBroadcaster.serverRemoved(server);
				checkServersUpdated(true);
				return ret;
			});
		};

		var removeServer = function(s) {
			var serverName = s.name? s.name:s;
			return isReady().then(function() {
				return getServer(serverName);
			}).then(function(server) {
				return Settings.getDefaultServerName().then(function(defaultServerName) {
					if (defaultServerName === serverName) {
						return Settings.setDefaultServerName(undefined).then(function() {
							return doRemoveServer(server);
						});
					} else {
						return doRemoveServer(server);
					}
				});
			});
		};

		var isServerConfigured = function() {
			return getDefaultServer().then(function(server) {
				if (server && server.name) {
					return true;
				} else {
					return false;
				}
			}, function(err) {
				return false;
			});
		};

		init();

		return {
			getDefault: getDefaultServer,
			setDefault: setDefaultServer,
			configured: isServerConfigured,
			names: getServerNames,
			all: getServers,
			get: getServer,
			put: putServer,
			remove: removeServer,
		};
	});

}());
