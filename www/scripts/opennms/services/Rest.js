(function() {
	'use strict';

	/* global ionic: true */
	/* global X2JS: true */
	/* global RestError: true */

	angular.module('opennms.services.Rest', [
		'ng',
		'opennms.services.Settings',
		'opennms.services.Util',
	])

	.factory('RestService', function($q, $rootScope, $window, $http, $injector, Settings, util) {
		console.log('RestService: Initializing.');

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

		if ($window.cordova && cordovaHTTP && ionic.Platform.isAndroid()) {
		//if ($window.cordova && cordovaHTTP) {
			useCordovaHTTP = true;
			cordovaHTTP.acceptAllCerts(true);
			cordovaHTTP.setTimeouts(requestTimeout, requestTimeout);
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

			var done = function() {
				if (oldReady) {
					oldReady.resolve(true);
				}
				ready.resolve(true);
				return ready.promise;
			};

			return clearCookies().then(function() {
				console.log('RestService.updateAuthorization: cleared cookies.');
				return Settings.username();
			}).then(function(u) {
				username = u;
				return Settings.password();
			}).then(function(p) {
				password = p;
				console.log('username=' + username +', password=' + password);
				if (username === undefined || password === undefined) {
					console.log('RestService.updateAuthorization: username or password not set.');
					delete $http.defaults.headers.common['Authorization'];
					return done();
				} else {
					//console.log('RestService.updateAuthorization: setting basic auth with username "' + username + '".');
					$http.defaults.headers.common['Authorization'] = 'Basic ' + $window.btoa(username + ':' + password);
					if (cordovaHTTP) {
						cordovaHTTP.useBasicAuth(username, password).then(function() {
							console.log('RestService.updateAuthorization: configured basic auth with username "' + username + '".');
						}, function(err) {
							console.log('RestService.updateAuthorization: failed to configure basic auth with username "' + username + '".');
						}, function() {
							return done();
						});
					} else {
						return done();
					}
				}
			}, function(err) {
				console.log('not ready: ' + angular.toJson(err));
				if (oldReady) {
					oldReady.reject(err);
				}
				ready.reject(err);
				return ready.promise;
			});
		};

		var getUrl = function(restFragment) {
			return ready.promise.then(function() {
				return Settings.restURL();
			}).then(function(restURL) {
				if (restURL) {
					restURL = restURL.replace(/\/$/, '');
					if (!restFragment.startsWith('/')) {
						restFragment = '/' + restFragment;
					}
					return restURL + restFragment;
				} else {
					return undefined;
				}
			});
		};

		var encodeData = function(data) {
			return Object.keys(data).map(function(key) {
				return [key, data[key]].map(encodeURIComponent).join("=");
			}).join("&");
		};

		var doQuery = function(method, restFragment, params, headers) {
			if (!params) {
				params = {};
			}
			if (!headers) {
				headers = {};
			}

			var url;
			return Settings.isServerConfigured().then(function(serverConfigured) {
				if (serverConfigured) {
					return getUrl(restFragment);
				} else {
					return $q.reject(new RestError(restFragment, undefined, 0, 'Server information is not complete.'));
				}
			}).then(function(u) {
				url = u;
				return Settings.restLimit();
			}).then(function(restLimit) {
				var myparams = angular.extend({}, { limit: restLimit });
				if (myparams.limit === 0) {
					delete myparams.limit;
				}
				return myparams;
			}).then(function(myparams) {
				var deferred = $q.defer();
				console.log('url=' + url + ', params=' + angular.toJson(myparams) + ', headers=' + angular.toJson(headers));
				if (useCordovaHTTP) {
					if (method === 'GET') {
						cordovaHTTP.get(url, myparams, headers).then(function(response) {
							deferred.resolve(response.data);
						}, function(response) {
							deferred.reject(new RestError(url, response.data, response.status));
						});
					} else if (method === 'PUT') {
						cordovaHTTP.put(url, myparams, headers).then(function(response) {
							deferred.resolve(response.data);
						}, function(response) {
							deferred.reject(new RestError(url, response.data, response.status));
						});
					} else if (method === 'POST') {
						cordovaHTTP.post(url, myparams, headers).then(function(response) {
							deferred.resolve(response.data);
						}, function(response) {
							deferred.reject(new RestError(url, response.data, response.status));
						});
					}
				} else {
					$http({
						method: method,
						url: url,
						params: myparams,
						headers: headers,
						withCredentials: true,
						timeout: requestTimeout,
					}).success(function(data) {
						//console.log('Rest.doQuery:',data);
						deferred.resolve(data);
					}).error(function(data, status, headers, config, statusText) {
						deferred.reject(new RestError(url, data, status, statusText));
					});
				}
				return deferred.promise;
			}, function(err) {
				console.log('Rest.doQuery: failed: ' + angular.toJson(err));
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
			return Settings.isServerConfigured().then(function(isConfigured) {
				if (isConfigured) {
					return getUrl(restFragment);
				} else {
					return $q.reject(new RestError(restFragment, undefined, 0, 'Server information is not complete.'));
				}
			}).then(function(url) {
				var deferred = $q.defer();
	
				if (!headers) {
					headers = {};
				}
				if (!headers['Content-Type']) {
					headers['Content-Type'] = 'application/xml';
				}

				$http.post(url, data, {
					withCredentials: true,
					timeout: requestTimeout,
					headers: headers,
				}).success(function(data) {
					//console.log('Rest.doQuery:',data);
					deferred.resolve(data);
				}).error(function(data, status, headers, config, statusText) {
					deferred.reject(new RestError(url, data, status, statusText));
				});

				return deferred.promise;
			});
		};

		util.onSettingsUpdated(updateAuthorization);
		updateAuthorization();

		return {
			url: getUrl,
			get: doGet,
			getXml: function(restFragment, params, headers) {
				var deferred = $q.defer();
				doGet(restFragment, params, headers).then(function(data) {
					var json = x2js.xml_str2json(data);
					//console.log('Rest.getXml:',json);
					deferred.resolve(json);
				}, function(err) {
					deferred.reject(err);
				});
				return deferred.promise;
			},
			put: doPut,
			postXml: doPostXml,
		};
	});

}());
