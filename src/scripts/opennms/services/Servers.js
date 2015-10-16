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
		'opennms.services.DB',
		'opennms.services.Settings',
		'opennms.services.Util',
	]).factory('Servers', function($q, $rootScope, $interval, $log, $timeout, uuid4, db, Settings, UtilEventBroadcaster, UtilEventHandler) {
		$log.info('Servers: Initializing.');

		var ready = $q.defer();
		var fsPrefix = 'servers';
		var servers = [];
		var defaultServer;

		var serversCollection = db.collection('servers', 'servers', { transactional: true });

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
			if (changedSettings && changedSettings.defaultServerId) {
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
			return serversCollection.then(function(sc) {
				return sc.chain().simplesort('name').data().map(function(obj) {
					return obj.name;
				});
			});
		};

		var _toServer = function(server) {
			if (!server) {
				return server;
			}
			if (Array.isArray(server)) {
				for (var i=0, len=server.length; i < len; i++) {
					server[i] = _toServer(server[i]);
				}
				return server;
			} else if (server instanceof Server) {
				return server;
			} else {
				return new Server(server);
			}
		};
		var _saveServer = function(server) {
			if (!server.id) {
				server.id = uuid4.generate();
			}

			return serversCollection.then(function(sc) {
				var existing = sc.findObject({'id': server.id});
				if (existing) {
					server = _toServer(angular.extend({}, existing, server));
					sc.update(server);
				} else {
					server = _toServer(server);
					sc.insert(server);
				}

				checkServersUpdated();
				return _toServer(server);
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
							return _saveServer(server);
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

		var getServerById = function(id) {
			return isReady().then(function() {
				return serversCollection.then(function(sc) {
					return _toServer(sc.findObject({id: id}));
				});
			});
		};

		var getServer = function(name) {
			return isReady().then(function() {
				return serversCollection.then(function(sc) {
					return _toServer(sc.findObject({name: name}));
				});
			});
		};

		var getServers = function() {
			return isReady().then(function() {
				return serversCollection.then(function(sc) {
					return sc.chain().simplesort('name').data().map(function(server) {
						return _toServer(server);
					});
				});
			});
		};

		var getServerNames = function() {
			return isReady().then(function() {
				return fetchServerNames();
			});
		};

		var getDefaultServer = function() {
			return isReady().then(function() {
				return Settings.getDefaultServerId().then(function(serverId) {
					return serversCollection.then(function(sc) {
						var server = sc.findObject({'id':serverId});
						if (server) {
							return _toServer(server);
						} else {
							return getServers().then(function(servers) {
								if (servers.length > 0) {
									Settings.setDefaultServerId(servers[0].id);
									return _toServer(servers[0]);
								} else {
									return undefined;
								}
							});
						}
					});
				});
			});
		};

		var setDefaultServer = function(server) {
			if (server && server.id) {
				return Settings.setDefaultServerId(server.id).then(function() {
					return checkServersUpdated();
				});
			} else {
				return $q.reject('Not sure how to handle server "'+server+'"');
			}
		};

		var saveServer = function(server) {
			return isReady().then(function() {
				return _saveServer(server);
			});
		};

		var removeServer = function(server) {
			return isReady().then(function() {
				return serversCollection.then(function(sc) {
					try {
						sc.removeWhere({'id':server.id});
					} catch (error) {
						if (error && error.message && error.message.indexOf('rematerialize is not a function') >= 0) {
							// known issue, ignore
							$log.debug('Known LokiJS error encountered.  Ignoring.');
						} else {
							return $q.reject(error);
						}
					}
					return Settings.getDefaultServerId().then(function(defaultServerId) {
						if (defaultServerId === server.id) {
							return Settings.setDefaultServerId(undefined).then(function() {
								UtilEventBroadcaster.serverRemoved(server);
								checkServersUpdated(true);
								return server;
							});
						} else {
							UtilEventBroadcaster.serverRemoved(server);
							checkServersUpdated(true);
							return server;
						}
					});
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
			save: saveServer,
			remove: removeServer,
		};
	});

}());
