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
	]).factory('Servers', function($q, $rootScope, $timeout, uuid4, Settings, StorageService, UtilEventBroadcaster, UtilEventHandler) {
		console.log('Servers: Initializing.');

		var ready = $q.defer();
		var fsPrefix = 'servers';
		var servers = [];
		var defaultServer = undefined;

		var isReady = function() {
			var deferred = $q.defer();
			ready.promise.then(function(r) {
				deferred.resolve(r);
			}, function(err) {
				deferred.resolve(false);
			});
			return deferred.promise;
		};

		var checkServersUpdated = function(force) {
			var oldServers = angular.copy(servers);
			return getServers().then(function(newServers) {
				servers = newServers;
				if (force || (angular.toJson(oldServers) !== angular.toJson(newServers))) {
					console.log('Servers.checkServersUpdated: server list has changed.');
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
				if (angular.toJson(oldDefaultServer) !== angular.toJson(newDefaultServer)) {
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

		var fetchServerNames = function() {
			return StorageService.list(fsPrefix).then(function(entries) {
				//console.log('fetchServerNames: ' + angular.toJson(entries));
				var ret = [], i, len = entries.length;
				for (i=0; i < len; i++) {
					var filename = entries[i];
					var serverName = decodeURIComponent(filename.replace(/\.json$/, ''));
					ret.push(serverName);
				}
				ret.sort();
				return ret;
			}, function(err) {
				console.log('Servers.fetchServerNames: WARNING: StorageService.list('+fsPrefix+') failed: ' + angular.toJson(err));
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
				console.log('Servers.saveServer: WARNING: StorageService.save(' + server.name + ') failed: ' + angular.toJson(err));
				return undefined;
			});
		};

		var init = function() {
			return fetchServerNames().then(function(names) {
				if (names.length > 0) {
					return names;
				} else {
					console.log('Servers.init: no server names found, attempting to upgrade old settings.');
					return Settings.get().then(function(settings) {
						console.log('Servers.init: settings = ' + angular.toJson(settings));
						if (settings.server !== undefined && settings.username !== undefined && settings.password !== undefined) {
							var server = new Server({
								name: URI(settings.server).hostname(),
								url: settings.server,
								username: settings.username,
								password: settings.password,
							});
							console.log('Servers.init: saving default server: ' + angular.toJson(server, true));
							return saveServer(server).then(function() {
								return server;
							});
						} else {
							console.log('Servers.init: No servers configured.');
							return $q.reject('No servers configured.');
						}
					}, function(err) {
						console.log('Servers.init: No settings found.');
						return $q.reject(err);
					});
				}
			}).then(function() {
				ready.resolve(true);
				return ready.promise;
			}, function(err) {
				console.log('Servers.init: failed initialization: ' + angular.toJson(err));
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
				console.log('Servers.getServer: failed to get ' + serverName + ': ' + angular.toJson(err));
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
					//console.log('servers='+angular.toJson(servers));
					var defaultServerName = servers.shift(), ret = [];
					len = servers.length;
					for (i=0; i < len; i++) {
						//console.log('servers['+i+']='+angular.toJson(servers[i]));
						if (servers[i] === null || servers[i] === undefined) {
							continue;
						}
						servers[i].isDefault = (servers[i].name === defaultServerName);
						ret.push(servers[i]);
					}
					return ret;
				});
			}, function(err) {
				console.log('Servers.getServers: failed: ' + angular.toJson(err));
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
					//console.log('Servers.getDefaultServer: ' + serverName);
					if (serverName) {
						return getServer(serverName);
					} else {
						return $q.reject('No default server name.');
					}
				});
			}, function(err) {
				console.log('Servers.getDefaultServer: failed: ' + angular.toJson(err));
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
