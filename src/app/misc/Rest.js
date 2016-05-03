(function() {
	'use strict';

	var angular = require('angular'),
		RestError = require('./RestError'),
		URI = require('urijs'),
		X2JS = require('x2js/xml2json');

	require('./HTTP');
	require('./util');

	require('../servers/Servers');
	require('../settings/SettingsService');

	angular.module('opennms.services.Rest', [
		'ng',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util',
		'opennms.util.HTTP'
	])

	.factory('RestService', function($q, $rootScope, $log, $window, HTTP, $injector, Servers, Settings, util) {
		$log.info('RestService: Initializing.');

		var currentServer = null;
		var ready = $q.defer();
		ready.resolve(false);

		var x2js = new X2JS();

		var clearCookies = function() {
			var deferred = $q.defer();
			if ($window.cookies && $window.cookies.clear) {
				$window.cookies.clear(function() {
					deferred.resolve(true);
				}, function() {
					deferred.resolve(false);
				});
			} else {
				deferred.resolve(false);
			}
			return deferred.promise;
		};

		var updateAuthorization = function() {
			var username, password;

			var oldReady = ready;
			var newReady = $q.defer();

			var done = function(reject) {
				if (oldReady) {
					if (reject) {
						oldReady.reject(false);
					} else {
						oldReady.resolve(true);
					}
				}
				if (reject) {
					newReady.reject(false);
				} else {
					newReady.resolve(true);
				}
				return newReady.promise;
			};

			ready = newReady;
			return clearCookies().then(function() {
				$log.debug('RestService.updateAuthorization: cleared cookies.');
				return Servers.getDefault();
			}).then(function(server) {
				currentServer = angular.copy(server);

				$log.debug('update authorization: default server = ' + (server && server.name? server.name:'unknown'));
				//$log.debug('username=' + server.username +', password=' + server.password);
				if (!server || angular.isUndefined(server.username) || angular.isUndefined(server.password)) {
					$log.info('RestService.updateAuthorization: username or password not set.');
					HTTP.useBasicAuth(undefined, undefined).then(function() {
						$log.debug('RestService.updateAuthorization: unconfigured basic auth.');
						return done();
					}, function(err) {
						$log.error('RestService.updateAuthorization: failed to unconfigure basic auth.');
						return done();
					});
				} else {
					//$log.debug('RestService.updateAuthorization: setting basic auth with username "' + server.username + '".');
					HTTP.useBasicAuth(server.username, server.password).then(function() {
						$log.debug('RestService.updateAuthorization: configured basic auth with username "' + server.username + '".');
						return done();
					}, function(err) {
						$log.error('RestService.updateAuthorization: failed to configure basic auth with username "' + server.username + '".');
						return done();
					});
				}
			}).catch(function(err) {
				$log.error('RestService.updateAuthorization: failed: ' + angular.toJson(err));
				return done(true);
			});
		};

		var getUrl = function(_restFragment) {
			$log.debug('RestService.getUrl: restFragment='+_restFragment);
			var restFragment = _restFragment || '';

			var getUrlForServer = function(server) {
				var restURL = server? server.restUrl() : undefined;
				//$log.debug('RestService.getUrl: restURL=' + restURL);
				if (restURL) {
					var uri = URI(restURL);
					if (restFragment.startsWith('/')) {
						restFragment = restFragment.slice(1); // eslint-disable-line no-magic-numbers
					}
					uri.segment(restFragment);
					//$log.debug('RestService.getUrl: returning=' + uri.toString());
					return uri.toString();
				}

				//$log.debug('RestService.getUrl: returning=undefined');
				return undefined;
			};

			return ready.promise.then(function() {
				//$log.debug('RestService.getUrl: ready');
				return Servers.getDefault();
			}).then(function(server) {
				if (server && server._id) {
					if (!currentServer || server._id !== currentServer._id) {
						var currentServerId = currentServer? currentServer._id : undefined;
						$log.debug('Rest.getUrl: current server has changed: ' + currentServerId + ' -> ' + server._id);
						return updateAuthorization().then(function() {
							return getUrlForServer(server);
						});
					}

					//$log.debug('Rest.getUrl: current server is unchanged: ' + server._id);
					return getUrlForServer(server);
				}

				$log.warn('Rest.getUrl: current server is unset');
				return undefined;
			});
		};

		var encodeData = function(data) {
			return Object.keys(data).map(function(key) {
				return [key, data[key]].map(encodeURIComponent).join('=');
			}).join('&');
		};

		var doQuery = function(method, restFragment, _params, _headers) {
			var params = _params || {};
			var headers = _headers || {};

			var url;
			return Servers.getDefault().then(function(server) {
				//$log.debug('Rest.doQuery: ' + method + ' ' + restFragment + ': isServerConfigured=' + serverConfigured);
				if (server) {
					return getUrl(restFragment);
				}

				return $q.reject(new RestError(restFragment, undefined, 0, 'Server information is not complete.')); // eslint-disable-line no-magic-numbers
			}).then(function(u) {
				//$log.debug('Rest.doQuery: ' + method + ' ' + restFragment + ': url=' + u);
				url = u;
				return Settings.restLimit();
			}).then(function(restLimit) {
				var myparams = angular.extend({}, { limit: restLimit }, params);
				if (myparams.limit === 0 || myparams.limit === null) { // eslint-disable-line no-magic-numbers
					delete myparams.limit;
				}
				return myparams;
			}).then(function(myparams) {
				var deferred = $q.defer();
				//$log.debug('Rest.doQuery: url=' + url + ', params=' + angular.toJson(myparams) + ', headers=' + angular.toJson(headers));

				return HTTP.call({
					method: method,
					url: url,
					params: myparams,
					headers: headers,
					withCredentials: true
				}).then(function(response) {
					return response.data;
				}, function(response) {
					var err = new RestError(url, response.data, response.status, response.statusText);
					//$log.debug('Rest.doQuery failed: ' + err.toString());
					return $q.reject(err);
				});

			}, function(err) {
				if (__DEVELOPMENT__) { $log.debug('Rest.doQuery: failed: ' + angular.toJson(err)); }
				return $q.reject(err);
			});
		};

		var doGet = function(restFragment, params, headers) {
			return doQuery('GET', restFragment, params, headers);
		};

		var doHead = function(restFragment, params, headers) {
			return doQuery('HEAD', restFragment, params, headers);
		};

		var doPut = function(restFragment, params, headers) {
			var h = angular.copy(headers) || {};
			h['Content-Type'] = 'application/x-www-form-urlencoded';
			return doQuery('PUT', restFragment, params, h);
		};

		var doPostXml = function(restFragment, data, headers) {
			var h = angular.copy(headers) || {};
			if (!h['Content-Type']) {
				h['Content-Type'] = 'application/xml';
			}

			return doQuery('POST', restFragment, data, headers);
		};

		return {
			url: getUrl,
			get: function(restFragment, params, headers) {
				return doGet(restFragment, params, headers).then(function(data) {
					var json;
					if (data && angular.isString(data)) {
						try {
							json = angular.fromJson(data);
						} catch (error) {
							$log.error('Rest.get: failed to parse "' + data + '" as JSON: ' + angular.toJson(error));
						}
					}
					if (json !== undefined) {
						return json;
					}

					return data;
				});
			},
			getXml: function(restFragment, params, headers) {
				return doGet(restFragment, params, headers).then(function(data) {
					var json = x2js.xml_str2json(data);
					//$log.debug('Rest.getXml:',json);
					return json;
				});
			},
			head: doHead,
			put: doPut,
			postXml: doPostXml
		};
	});

}());
