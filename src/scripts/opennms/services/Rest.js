(function() {
	'use strict';

	/* global ionic: true */
	/* global X2JS: true */
	/* global RestError: true */

	angular.module('opennms.services.Rest', [
		'ng',
		'cordovaHTTP',
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
				console.log('RestService.updateAuthorization: cleared cookies.');
				return Settings.username();
			}).then(function(u) {
				username = u;
				return Settings.password();
			}).then(function(p) {
				password = p;
				//console.log('username=' + username +', password=' + password);
				if (username === undefined || password === undefined) {
					console.log('RestService.updateAuthorization: username or password not set.');
					delete $http.defaults.headers.common['Authorization'];
					return done();
				} else {
					//console.log('RestService.updateAuthorization: setting basic auth with username "' + username + '".');
					$http.defaults.headers.common['Authorization'] = 'Basic ' + $window.btoa(username + ':' + password);
					if (useCordovaHTTP) {
						return cordovaHTTP.useBasicAuth(username, password).then(function() {
							console.log('RestService.updateAuthorization: configured basic auth with username "' + username + '".');
							return done();
						}, function(err) {
							console.log('RestService.updateAuthorization: failed to configure basic auth with username "' + username + '".');
							return done();
						});
					} else {
						return done();
					}
				}
			}, function(err) {
				console.log('RestService.updateAuthorization: failed: ' + angular.toJson(err));
				return done(true);
			});
		};

		var getUrl = function(restFragment) {
			//console.log('RestService.getUrl: restFragment='+restFragment);
			return ready.promise.then(function() {
				//console.log('RestService.getUrl: ready');
				return Settings.restURL();
			}).then(function(restURL) {
				//console.log('RestService.getUrl: restURL=' + restURL);
				if (restURL) {
					restURL = restURL.replace(/\/$/, '');
					if (!restFragment.startsWith('/')) {
						restFragment = '/' + restFragment;
					}
					//console.log('RestService.getUrl: returning=' + restURL + restFragment);
					return restURL + restFragment;
				} else {
					//console.log('RestService.getUrl: returning=undefined');
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
				//console.log('Rest.doQuery: ' + method + ' ' + restFragment + ': isServerConfigured=' + serverConfigured);
				if (serverConfigured) {
					return getUrl(restFragment);
				} else {
					return $q.reject(new RestError(restFragment, undefined, 0, 'Server information is not complete.'));
				}
			}).then(function(u) {
				//console.log('Rest.doQuery: ' + method + ' ' + restFragment + ': url=' + u);
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
				//console.log('Rest.doQuery: url=' + url + ', params=' + angular.toJson(myparams) + ', headers=' + angular.toJson(headers));

				if (useCordovaHTTP) {
					var handleSuccess = function(response) {
						//console.log('Rest.doQuery: got: ' + angular.toJson(response.data));
						return response.data;
					};
					var handleError = function(err) {
						var error = new RestError(url, err.data, err.status);
						console.log('Rest.doQuery: failed: ' + error.toString());
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
					//console.log('Rest.doQuery: starting');
					return $http({
						method: method,
						url: url,
						params: myparams,
						headers: headers,
						withCredentials: true,
						timeout: requestTimeout,
					}).then(function(response) {
						//console.log('Rest.doQuery:',response.data);
						return response.data;
					}, function(response) {
						var err = new RestError(url, response.data, response.status, response.statusText);
						//console.log('Rest.doQuery failed: ' + err.toString());
						return $q.reject(err);
					});
				}
			}, function(err) {
				//console.log('Rest.doQuery: failed: ' + angular.toJson(err));
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
				if (!headers) {
					headers = {};
				}
				if (!headers['Content-Type']) {
					headers['Content-Type'] = 'application/xml';
				}

				return $http.post(url, data, {
					withCredentials: true,
					timeout: requestTimeout,
					headers: headers,
				}).success(function(data) {
					//console.log('Rest.doQuery:',data);
					return data;
				}).error(function(data, status, headers, config, statusText) {
					return $q.reject(new RestError(url, data, status, statusText));
				});
			});
		};

		util.onSettingsUpdated(updateAuthorization);
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
								console.log('Rest.get: failed to parse "' + data + "' as JSON: " + error);
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
					//console.log('Rest.getXml:',json);
					return json;
				});
			},
			put: doPut,
			postXml: doPostXml,
		};
	});

}());
