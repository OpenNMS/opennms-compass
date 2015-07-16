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
	]).factory('Servers', function($q, $rootScope, uuid4, Settings, StorageService, UtilEventBroadcaster, UtilEventHandler) {
		console.log('Servers: Initializing.');

		var ready = $q.defer();
		var fsPrefix = 'servers';
		var servers = [];

		var checkServersUpdated = function(force) {
			var oldServers = angular.copy(servers);
			return getServers().then(function(newServers) {
				if (force || (angular.toJson(servers) !== angular.toJson(newServers))) {
					var i, len=newServers.length, defaultServer;
					for (i=0; i < len; i++) {
						if (newServers[i].isDefault) {
							defaultServer = newServers[i];
							break;
						}
					}
					UtilEventBroadcaster.dirty('all');
					console.log('Servers.checkServersUpdated: server list has changed.');
					$rootScope.$broadcast('opennms.servers.updated', newServers, oldServers, defaultServer);
				}
				return newServers;
			});
		};

		UtilEventHandler.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
			if (changedSettings && changedSettings.defaultServerName) {
				checkServersUpdated(true);
			}
		});

		var fetchServerNames = function() {
			return StorageService.list(fsPrefix).then(function(entries) {
				var ret = [], i, len = entries.length;
				for (i=0; i < len; i++) {
					var serverName = decodeURIComponent(entries[i].name.replace(/\.json$/, ''));
					ret.push(serverName);
				}
				ret.sort();
				return ret;
			}, function(err) {
				console.log('Servers.fetchServerNames: WARNING: StorageService.list failed: ' + angular.toJson(err));
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
				console.log('Servers.saveServer: WARNING: StorageService.save failed: ' + angular.toJson(err));
				return undefined;
			});
		};

		var init = function() {
			return fetchServerNames().then(function(names) {
				if (names.length === 0) {
					console.log('Servers.init: no server names found, upgrading old settings.');
					return Settings.get().then(function(settings) {
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
							return $q.reject('No servers configured.');
						}
					});
				} else {
					return names;
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
			return ready.promise.then(function() {
				return StorageService.load(fsPrefix + '/' + encodeURIComponent(serverName) + '.json').then(function(data) {
					if (!data.id) {
						data.id = uuid4.generate();
					}
					return new Server(data);
				}, function(err) {
					console.log('Servers.getServer: failed to get ' + serverName + ' from the filesystem: ' + angular.toJson(err));
					return $q.reject(err);
				});
			}, function(err) {
				console.log('Servers.getServer: failed to get ' + serverName + ': ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var getServers = function() {
			return getServerNames().then(function(names) {
				var promises = [], i, len = names.length;
				promises.push(Settings.getDefaultServerName());
				for (i=0; i < len; i++) {
					promises.push(getServer(names[i]));
				}
				return $q.all(promises).then(function(servers) {
					var defaultServerName = servers.shift();
					len = servers.length;
					for (i=0; i < len; i++) {
						servers[i].isDefault = (servers[i].name === defaultServerName);
					}
					return servers;
				});
			}, function(err) {
				console.log('Servers.getServers: failed: ' + angular.toJson(err));
				return [];
			});
		};

		var getServerNames = function() {
			return ready.promise.then(function() {
				return fetchServerNames();
			});
		};

		var getDefaultServer = function() {
			return ready.promise.then(function() {
				return Settings.getDefaultServerName().then(function(serverName) {
					//console.log('Servers.getDefaultServer: ' + serverName);
					if (serverName) {
						return getServer(serverName);
					} else {
						return undefined;
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
			return ready.promise.then(function() {
				return saveServer(server);
			});
		};

		var removeServer = function(server) {
			var serverName = server.name? server.name:server;
			return ready.promise.then(function() {
				return StorageService.remove(fsPrefix + '/' + encodeURIComponent(serverName) + '.json').then(function(ret) {
					checkServersUpdated();
					return ret;
				});
			});
		};

		init();

		return {
			getDefault: getDefaultServer,
			setDefault: setDefaultServer,
			names: getServerNames,
			all: getServers,
			get: getServer,
			put: putServer,
			remove: removeServer,
		};
	});

}());
