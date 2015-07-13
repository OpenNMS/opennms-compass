(function() {
	'use strict';

	/* global cordova: true */
	/* global ionic: true */
	/* global moment: true */
	/* global Server: true */

	angular.module('opennms.services.Servers', [
		'ionic',
		'ngCordova',
		'opennms.services.Settings',
		'opennms.services.Storage',
	]).factory('Servers', function($q, $rootScope, Settings, StorageService) {
		console.log('Servers: Initializing.');

		var ready = $q.defer();
		var fsPrefix = 'servers';

		var _getServerNames = function() {
			return StorageService.list(fsPrefix).then(function(entries) {
				var ret = [], i, len = entries.length;
				for (i=0; i < len; i++) {
					var serverName = decodeURIComponent(entries[i].name.replace(/\.json$/, ''));
					ret.push(serverName);
				}
				return ret;
				/*
				//console.log('Servers.getServerNames: entries = ' + angular.toJson(entries, true));
				if (entries.length === 0) {
					return entries;
				}
				return $q.reject('failed');
				*/
			});
		};

		var _saveServer = function(server) {
			return StorageService.save(fsPrefix + '/' + encodeURIComponent(server.name) + '.json', server);
		};

		var init = function() {
			return _getServerNames().then(function(names) {
				if (names.length === 0) {
					console.log('Servers.init: no server names found, upgrading old settings.');
					return Settings.isServerConfigured().then(function(isConfigured) {
						if (isConfigured) {
							return $q.all([
								Settings.getServerName(),
								Settings.URL(),
								Settings.username(),
								Settings.password(),
							]).then(function(results) {
								var server = new Server({
									name: results[0],
									url: results[1],
									username: results[2],
									password: results[3],
								});
								console.log('Servers.init: saving default server: ' + angular.toJson(server, true));
								return _saveServer(server).then(function() {
									ready.resolve(true);
									return server;
								});
							});
						} else {
							console.log('Servers.init: no settings configured.  Giving up.');
							ready.resolve(true);
							return $q.reject('Server not configured.');
						}
					});
				} else {
					ready.resolve(true);
					return names;
				}
				return ready.promise;
			}, function(err) {
				ready.resolve(true);
				return ready.promise;
			});
		};

		var getServer = function(serverName) {
			return ready.promise.then(function() {
				return StorageService.load(fsPrefix + '/' + encodeURIComponent(serverName) + '.json').then(function(data) {
					return new Server(data);
				});
			});
		};

		var getServers = function() {
			return getServerNames().then(function(names) {
				var promises = [], i, len = names.length;
				for (i=0; i < len; i++) {
					promises.push(getServer(names[i]));
				}
				return $q.all(promises);
			});
		};

		var getServerNames = function() {
			return ready.promise.then(function() {
				return _getServerNames();
			});
		};

		var getDefaultServer = function() {
			return ready.promise.then(function() {
				return Settings.getServerName().then(function(serverName) {
					console.log('Servers.getDefaultServer: ' + serverName);
					return getServer(serverName);
				});
			});
		};

		var putServer = function(server) {
			return ready.promise.then(function() {
				return _saveServer(server);
			});
		};

		var removeServer = function(server) {
			var serverName = server.name? server.name:server;
			return ready.promise.then(function() {
				return StorageService.remove(fsPrefix + '/' + encodeURIComponent(serverName) + '.json');
			});
		};

		init();

		return {
			getDefault: getDefaultServer,
			names: getServerNames,
			all: getServers,
			get: getServer,
			put: putServer,
			remove: removeServer,
		};
	});

}());
