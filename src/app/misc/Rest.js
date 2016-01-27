(function() {
	'use strict';

	var angular = require('angular'),
		RestError = require('./RestError'),
		URI = require('urijs'),
		X2JS = require('x2js/xml2json');

	require('./util');

	require('../servers/Servers');
	require('../settings/SettingsService');

	angular.module('opennms.services.Rest', [
		'ng',
		'cordovaHTTP',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util'
	])

	.factory('RestService', function($q, $rootScope, $log, $window, $http, $injector, Servers, Settings, util) {
		$log.info('RestService: Initializing.');

		var ready = $q.defer();

		var cordovaHTTP;
		if ($injector.has('cordovaHTTP')) {
			cordovaHTTP = $injector.get('cordovaHTTP');
		}

		var useCordovaHTTP = false;
		var requestTimeout = 10000;
		var x2js = new X2JS();
		/* jshint -W069 */ /* "better written in dot notation" */
		$http.defaults.headers.common['Accept'] = 'application/xml';

		if ($window.cordova && cordovaHTTP) {
			$log.debug('RestService: Cordova HTTP is available.');
			useCordovaHTTP = true;
			cordovaHTTP.acceptAllCerts(true);
			cordovaHTTP.setTimeouts(requestTimeout, requestTimeout);
		} else {
			$log.debug('RestService: Cordova HTTP is not available.');
		}

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
			ready = $q.defer();

			var done = function(reject) {
				if (oldReady) {
					if (reject) {
						oldReady.reject(false);
					} else {
						oldReady.resolve(true);
					}
				}
				if (reject) {
					ready.reject(false);
				} else {
					ready.resolve(true);
				}
				return ready.promise;
			};

			return clearCookies().then(function() {
				$log.debug('RestService.updateAuthorization: cleared cookies.');
				return Servers.getDefault();
			}).then(function(server) {
				$log.debug('update authorization: default server = ' + (server && server.name? server.name:'unknown'));
				//$log.debug('username=' + server.username +', password=' + server.password);
				if (!server || angular.isUndefined(server.username) || angular.isUndefined(server.password)) {
					$log.info('RestService.updateAuthorization: username or password not set.');
					delete $http.defaults.headers.common['Authorization'];
					if (useCordovaHTTP) {
						return cordovaHTTP.useBasicAuth(undefined, undefined).then(function() {
							$log.debug('RestService.updateAuthorization: unconfigured basic auth.');
							return done();
						}, function(err) {
							$log.error('RestService.updateAuthorization: failed to unconfigure basic auth.');
							return done();
						});
					} else {
						return done();
					}
				} else {
					//$log.debug('RestService.updateAuthorization: setting basic auth with username "' + server.username + '".');
					$http.defaults.headers.common['Authorization'] = 'Basic ' + $window.btoa(server.username + ':' + server.password);
					if (useCordovaHTTP) {
						return cordovaHTTP.useBasicAuth(server.username, server.password).then(function() {
							$log.debug('RestService.updateAuthorization: configured basic auth with username "' + server.username + '".');
							return done();
						}, function(err) {
							$log.error('RestService.updateAuthorization: failed to configure basic auth with username "' + server.username + '".');
							return done();
						});
					} else {
						return done();
					}
				}
			}, function(err) {
				$log.error('RestService.updateAuthorization: failed: ' + angular.toJson(err));
				return done(true);
			});
		};

		var getUrl = function(restFragment) {
			//$log.debug('RestService.getUrl: restFragment='+restFragment);
			return ready.promise.then(function() {
				//$log.debug('RestService.getUrl: ready');
				return Servers.getDefault();
			}).then(function(server) {
				var restURL = server? server.restUrl() : undefined;
				//$log.debug('RestService.getUrl: restURL=' + restURL);
				if (restURL) {
					var uri = URI(restURL);
					if (restFragment.startsWith('/')) {
						restFragment = restFragment.slice(1);
					}
					uri.segment(restFragment);
					//$log.debug('RestService.getUrl: returning=' + uri.toString());
					return uri.toString();
				} else {
					//$log.debug('RestService.getUrl: returning=undefined');
					return undefined;
				}
			});
		};

		var encodeData = function(data) {
			return Object.keys(data).map(function(key) {
				return [key, data[key]].map(encodeURIComponent).join('=');
			}).join('&');
		};

		var doQuery = function(method, restFragment, params, headers) {
			if (!params) {
				params = {};
			}
			if (!headers) {
				headers = {};
			}

			var url;
			return Servers.getDefault().then(function(server) {
				//$log.debug('Rest.doQuery: ' + method + ' ' + restFragment + ': isServerConfigured=' + serverConfigured);
				if (server) {
					return getUrl(restFragment);
				} else {
					return $q.reject(new RestError(restFragment, undefined, 0, 'Server information is not complete.'));
				}
			}).then(function(u) {
				//$log.debug('Rest.doQuery: ' + method + ' ' + restFragment + ': url=' + u);
				url = u;
				return Settings.restLimit();
			}).then(function(restLimit) {
				var myparams = angular.extend({}, { limit: restLimit }, params);
				if (myparams.limit === 0) {
					delete myparams.limit;
				}
				return myparams;
			}).then(function(myparams) {
				var deferred = $q.defer();
				//$log.debug('Rest.doQuery: url=' + url + ', params=' + angular.toJson(myparams) + ', headers=' + angular.toJson(headers));

				if (useCordovaHTTP) {
					var handleSuccess = function(response) {
						//$log.debug('Rest.doQuery: got: ' + angular.toJson(response.data));
						return response.data;
					};
					var handleError = function(err) {
						var error = new RestError(url, err.data, err.status);
						$log.error('Rest.doQuery: failed: ' + error.toString());
						return $q.reject(error);
					};

					if (method === 'GET') {
						return cordovaHTTP.get(url, myparams, headers).then(handleSuccess, handleError);
					} else if (method === 'PUT') {
						return cordovaHTTP.put(url, myparams, headers).then(handleSuccess, handleError);
					} else if (method === 'POST') {
						return cordovaHTTP.post(url, myparams, headers).then(handleSuccess, handleError);
					}
				} else {
					//$log.debug('Rest.doQuery: starting');
					return $http({
						method: method,
						url: url,
						params: myparams,
						headers: headers,
						withCredentials: true,
						timeout: requestTimeout
					}).then(function(response) {
						//$log.debug('Rest.doQuery:',response.data);
						return response.data;
					}, function(response) {
						var err = new RestError(url, response.data, response.status, response.statusText);
						//$log.debug('Rest.doQuery failed: ' + err.toString());
						return $q.reject(err);
					});
				}
			}, function(err) {
				//$log.debug('Rest.doQuery: failed: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var doGet = function(restFragment, params, headers) {
			return doQuery('GET', restFragment, params, headers);
		};

		var doPut = function(restFragment, params, headers) {
			var h = angular.copy(headers) || {};
			h['Content-Type'] = 'application/x-www-form-urlencoded';
			return doQuery('PUT', restFragment, params, h);
		};

		var doPostXml = function(restFragment, data, headers) {
			return Servers.getDefault().then(function(server) {
				if (server) {
					return getUrl(restFragment);
				} else {
					return $q.reject(new RestError(restFragment, undefined, 0, 'Server information is not complete.'));
				}
			}).then(function(url) {
				if (!headers) {
					headers = {};
				}
				if (!headers['Content-Type']) {
					headers['Content-Type'] = 'application/xml';
				}

				return $http.post(url, data, {
					withCredentials: true,
					timeout: requestTimeout,
					headers: headers
				}).success(function(data) {
					//$log.debug('Rest.doQuery:',data);
					return data;
				}).error(function(data, status, headers, config, statusText) {
					return $q.reject(new RestError(url, data, status, statusText));
				});
			});
		};

		util.onServersUpdated(updateAuthorization);
		updateAuthorization();

		return {
			url: getUrl,
			get: function(restFragment, params, headers) {
				return doGet(restFragment, params, headers).then(function(data) {
					if (useCordovaHTTP) {
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
						} else {
							return data;
						}
					} else {
						return data;
					}
				});
			},
			getXml: function(restFragment, params, headers) {
				return doGet(restFragment, params, headers).then(function(data) {
					var json = x2js.xml_str2json(data);
					//$log.debug('Rest.getXml:',json);
					return json;
				});
			},
			put: doPut,
			postXml: doPostXml,
			getCordovaHTTP: function() {
				if (useCordovaHTTP) {
					return cordovaHTTP;
				} else {
					return undefined;
				}
			}
		};
	});

}());
