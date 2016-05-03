(function() {
	'use strict';

	var DB_NAME = 'servers';

	var angular = require('angular'),
		moment = require('moment'),
		Server = require('./models/Server'),
		URI = require('urijs');

	require('../db/db');
	require('../events/EventService');
	require('../settings/SettingsService');

	var serverTypeMatch = new RegExp('^([Hh][Tt][Tt][Pp][Ss]?):');

	angular.module('opennms.services.Servers', [
		'ionic',
		'ngCordova',
		'uuid4',
		'opennms.services.DB',
		'opennms.services.Settings',
		'opennms.services.Util'
	]).factory('Servers', function($q, $rootScope, $interval, $log, uuid4, db, Settings, UtilEventBroadcaster, UtilEventHandler) {
		$log.info('Servers: Initializing.');

		var ready = $q.defer();
		var servers = [];
		var defaultServer;

		var serversDB = db.get(DB_NAME);
		var findServers = function(options) {
			return serversDB.createIndex({
				index: {
					fields: Object.keys(options.selector)
				}
			}).then(function() {
				return serversDB.find(options);
			});
		};

		var isReady = function() {
			var deferred = $q.defer();
			ready.promise.then(function(r) {
				deferred.resolve(r);
			}, function(err) {
				deferred.resolve(false);
			});
			return deferred.promise;
		};

		var _sortServers = function(a, b) {
			if (a && b) {
				return a.name.localeCompare(b.name);
			}
			return 0; // eslint-disable-line no-magic-numbers
		};

		var _toServer = function(server) {
			if (!server) {
				return server;
			}
			if (angular.isArray(server)) {
				for (var i=0, len=server.length; i < len; i++) {
					server[i] = _toServer(server[i]);
				}
				return server;
			} else if (server instanceof Server) {
				return server;
			}
			return new Server(server);
		};

		var getServers = function() {
			return isReady().then(function() {
				return findServers({
					selector: { name: {$gt: null}},
					sort: ['name']
				}).then(function(docs) {
					return _toServer(docs.docs);
				});
			});
		};

		var getDefaultServer = function() {
			var onFailure = function() {
				return getServers().then(function(servers) {
					/* eslint-disable no-magic-numbers */
					if (servers.length > 0) {
						Settings.setDefaultServerId(servers[0]._id);
						return _toServer(servers[0]);
					}
					/* eslint-enable no-magic-numbers */

					return undefined;
				});
			};

			return isReady().then(function() {
				return Settings.getDefaultServerId().then(function(serverId) {
					if (serverId) {
						return serversDB.get(serverId).then(function(server) {
							return _toServer(server);
						}).catch(function(err) {
							if (err.error && err.reason === 'missing') {
								return onFailure();
							}

							$log.error('Failed to get server ' + serverId + ': ' + angular.toJson(err));
							return $q.reject(err);
						});
					}

					return onFailure();
				});
			});
		};

		var checkDefaultServerUpdated = function() {
			var oldDefaultServer = defaultServer;
			return getDefaultServer().then(function(newDefaultServer) {
				defaultServer = newDefaultServer;
				if (!angular.equals(oldDefaultServer, newDefaultServer)) {
					UtilEventBroadcaster.defaultServerUpdated(newDefaultServer);
					var match = serverTypeMatch.exec(newDefaultServer.url);
					if (match && match.length > 0) { // eslint-disable-line no-magic-numbers
						$rootScope.$broadcast('opennms.analytics.trackEvent', 'settings', 'serverType', 'Server Type', match[0]); // eslint-disable-line no-magic-numbers
					}
				}
				return defaultServer;
			});
		};

		var _checkServersUpdated = function(force, count) {
			//$log.error('Servers._checkServersUpdated: ' + (count || 0)); // eslint-disable-line no-magic-numbers
			var oldServers = angular.copy(servers);
			oldServers.sort(_sortServers);
			return getServers().then(function(newServers) {
				newServers.sort(_sortServers);
				servers = angular.copy(newServers);
				if (force === true || !angular.equals(oldServers, newServers)) {
					if (__DEVELOPMENT__) {
						$log.debug('Servers._checkServersUpdated: server list has changed.');
						$log.debug('old: ' + angular.toJson(oldServers));
						$log.debug('new: ' + angular.toJson(newServers));
					}
					UtilEventBroadcaster.serversUpdated(newServers, oldServers);
				}
				return checkDefaultServerUpdated().then(function() {
					return newServers;
				});
			}, function(err) {
				$log.error('Servers._checkServersUpdated: error: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var checkingCount = 0;
		var checking = null;
		var checkServersUpdated = function(force) {
			if (checking) {
				var deferred = $q.defer();

				checking.finally(function() {
					_checkServersUpdated(force, ++checkingCount).then(function(ret) {
						deferred.resolve(ret);
					}, function(err) {
						deferred.reject(err);
					});
				});
				checking = deferred.promise;
			} else {
				checking = _checkServersUpdated(force, ++checkingCount);
			}
			return checking;
		};

		var fetchServerNames = function() {
			return findServers({
				selector: {name: {$gt: null}},
				sort: ['name']
			}).then(function(docs) {
				return docs.docs.map(function(server) {
					return server.name;
				});
			});
		};

		var _saveServer = function(_server) {
			var server = angular.fromJson(angular.toJson(_server));
			if (!server._id) {
				server._id = uuid4.generate();
			}

			return serversDB.get(server._id).then(function(doc) {
				angular.extend(doc, server);
				if (__DEVELOPMENT__) { $log.debug('_saveServer: updating: ' + angular.toJson(doc)); }
				return serversDB.put(doc).then(function(result) {
					doc._rev = result.rev;
					return doc;
				});
			}).catch(function(err) {
				if (err.error && err.reason === 'missing') {
					if (__DEVELOPMENT__) { $log.debug('_saveServer: saving: ' + angular.toJson(server)); }
					return serversDB.put(server).then(function(result) {
						server._rev = result.rev;
						return server;
					}).catch(function(err) {
						$log.error('Failed to save ' + server.name + ': ' + angular.toJson(err));
						return $q.reject(err);
					});
				}

				$log.error('Failed to get server ' + server.name + ' (' + server._id + '): ' + angular.toJson(err));
				return $q.reject(err);
			}).finally(function() {
				checkServersUpdated();
			});
		};

		var init = function() {
			return fetchServerNames().then(function(names) {
				if (names.length > 0) { // eslint-disable-line no-magic-numbers
					return names;
				}

				$log.info('Servers.init: no server names found, attempting to upgrade old settings.');
				return Settings.get().then(function(settings) {
					if (__DEVELOPMENT__) { $log.debug('Servers.init: settings = ' + angular.toJson(settings)); }
					if (settings.server !== undefined && settings.username !== undefined && settings.password !== undefined) {
						var server = new Server({
							name: URI(settings.server).hostname(),
							url: settings.server,
							username: settings.username,
							password: settings.password
						});
						if (__DEVELOPMENT__) { $log.debug('Servers.init: saving default server: ' + angular.toJson(server, true)); }
						return _saveServer(server);
					}

					$log.debug('Servers.init: No servers configured.');
					return $q.reject('No servers configured.');
				}, function(err) {
					$log.info('Servers.init: No settings found.');
					return $q.reject(err);
				});
			}).then(function() {
				ready.resolve(true);
				return ready.promise;
			}, function(err) {
				$log.error('Servers.init: failed initialization: ' + angular.toJson(err));
				ready.resolve(false);
				return ready.promise;
			});
		};

		var getServerNames = function() {
			return isReady().then(function() {
				return fetchServerNames();
			});
		};

		var setDefaultServer = function(server) {
			if (server && server._id) {
				return Settings.setDefaultServerId(server._id);
			}

			return $q.reject('Not sure how to handle server "'+server+'"');
		};

		var saveServer = function(server) {
			return isReady().then(function() {
				return _saveServer(server);
			});
		};

		var removeServer = function(server) {
			return isReady().then(function() {
				return serversDB.remove(server).then(function() {
					return Settings.getDefaultServerId().then(function(defaultServerId) {
						if (defaultServerId === server._id) {
							return Settings.setDefaultServerId(undefined).then(function() {
								UtilEventBroadcaster.serverRemoved(server);
								return server;
							});
						}

						UtilEventBroadcaster.serverRemoved(server);
						return server;
					});
				});
			}).finally(function() {
				checkServersUpdated();
			});
		};

		var isServerConfigured = function() {
			return getDefaultServer().then(function(server) {
				return server && server.name;
			}).catch(function(err) {
				return false;
			});
		};

		UtilEventHandler.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
			if (changedSettings && changedSettings.defaultServerId) {
				$rootScope.$evalAsync(checkServersUpdated);
			}
		});

		init();

		return {
			getDefault: getDefaultServer,
			setDefault: setDefaultServer,
			configured: isServerConfigured,
			names: getServerNames,
			all: getServers,
			save: saveServer,
			remove: removeServer
		};
	});

}());
