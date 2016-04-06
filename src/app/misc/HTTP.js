'use strict';

var module = angular.module('opennms.util.HTTP', [
	'ng'
]);

ionic.Platform.ready(function() {
	if (window.cordovaHTTP) {
		/* eslint-disable no-console */
		console.log('window.cordovaHTTP found.');
		/* eslint-enable no-console */
		module.factory('cordovaHTTP', function($timeout, $q) {
			function makePromise(fn, args, async) {
				var deferred = $q.defer();

				var success = function(response) {
					if (async) {
						$timeout(function() {
							deferred.resolve(response);
						});
					} else {
						deferred.resolve(response);
					}
				};

				var fail = function(response) {
					if (async) {
						$timeout(function() {
							deferred.reject(response);
						});
					} else {
						deferred.reject(response);
					}
				};

				args.push(success);
				args.push(fail);

				fn.apply(cordovaHTTP, args);

				return deferred.promise;
			}

			return {
				useBasicAuth: function(username, password) {
					return makePromise(cordovaHTTP.useBasicAuth, [username, password]);
				},
				setHeader: function(header, value) {
					return makePromise(cordovaHTTP.setHeader, [header, value]);
				},
				enableSSLPinning: function(enable) {
					return makePromise(cordovaHTTP.enableSSLPinning, [enable]);
				},
				acceptAllCerts: function(allow) {
					return makePromise(cordovaHTTP.acceptAllCerts, [allow]);
				},
				setTimeouts: function(connectionTimeout, readTimeout) {
					return makePromise(cordovaHTTP.setTimeouts, [connectionTimeout, readTimeout]);
				},
				head: function(url, params, headers) {
					return makePromise(cordovaHTTP.head, [url, params, headers], true);
				},
				post: function(url, params, headers) {
					return makePromise(cordovaHTTP.post, [url, params, headers], true);
				},
				put: function(url, params, headers) {
					return makePromise(cordovaHTTP.put, [url, params, headers], true);
				},
				delete: function(url, params, headers) {
					return makePromise(cordovaHTTP.delete, [url, params, headers], true);
				},
				get: function(url, params, headers) {
					return makePromise(cordovaHTTP.get, [url, params, headers], true);
				},
				uploadFile: function(url, params, headers, filePath, name) {
					return makePromise(cordovaHTTP.uploadFile, [url, params, headers, filePath, name], true);
				},
				downloadFile: function(url, params, headers, filePath) {
					return makePromise(cordovaHTTP.downloadFile, [url, params, headers, filePath], true);
				}
			};
		});
	} else {
		/* eslint-disable no-console */
		console.log('!!!! window.cordovaHTTP NOT found.');
		/* eslint-enable no-console */
	}
});

module.factory('HTTP', function($http, $injector, $log, $q, $window) {
	//var requestTimeout = parseInt($injector.get('config.request.timeout'), 10) * 1000;
	var requestTimeout = 10000;
	var enableCachebusting = false;
	var basicAuth = null;

	var ready;
	var initialize = function() {
		var deferred = $q.defer();

		if ($injector.has('cordovaHTTP')) {
			$log.info('HTTP: Cordova HTTP is available.');
			var cordovaHTTP = $injector.get('cordovaHTTP');
			cordovaHTTP.enableSSLPinning(false);
			cordovaHTTP.acceptAllCerts(true);
			cordovaHTTP.setTimeouts(requestTimeout, requestTimeout);
			deferred.resolve(cordovaHTTP);
		} else {
			$log.warn('HTTP: Cordova HTTP is not available.');
			deferred.resolve(undefined);
		}
		return deferred.promise;
	};

	var defaultOptions = {
		cache: false,
		timeout: requestTimeout,
		withCredentials: true,
		headers: {
			Accept: 'application/xml'
		}
	};

	var call = function(passedOptions) {
		var options = angular.merge({}, defaultOptions, passedOptions);

		if (!ready) {
			ready = initialize();
		}

		return ready.then(function(cordovaHTTP) {
			if (options.url.indexOf('http') !== 0) {
				return $q.reject(options.url + ' is not a valid URL!');
			}

			if (!options.params) {
				options.params = {};
			}

			if (options.method === 'GET' && enableCachebusting) {
				options.params._x = new Date().getTime();
			}

			if (options.params.cache) {
				// disable cachebusting for this request
				options.cache = true;
				delete options.params._x;
				delete options.params.cache;
			}

			if (basicAuth && basicAuth.header && !options.headers.hasOwnProperty('Authorization')) {
				$log.debug('HTTP.call: setting Authorization header to ' + basicAuth.header);
				options.headers.Authorization = basicAuth.header;
			}

			if (cordovaHTTP) {
				$log.debug('Making Cordova HTTP call with options:' + angular.toJson(options));
				var handleSuccess = function(response) {
					//$log.debug('HTTP.handleSuccess: ' + angular.toJson(response.data));
					return response;
				};
				var handleError = function(err) {
					$log.error('HTTP.handleError: ' + angular.toJson(err));
					return $q.reject(err);
				};

				if (options.method === 'GET') {
					return cordovaHTTP.get(options.url, options.params, options.headers).then(handleSuccess, handleError);
				} else if (options.method === 'HEAD') {
					return cordovaHTTP.head(options.url, options.params, options.headers).then(handleSuccess, handleError);
				} else if (options.method === 'PUT') {
					options.params = angular.extend({}, options.data, options.params);
					return cordovaHTTP.put(options.url, options.params, options.headers).then(handleSuccess, handleError);
				} else if (options.method === 'POST') {
					options.params = angular.extend({}, options.data, options.params);
					return cordovaHTTP.post(options.url, options.params, options.headers).then(handleSuccess, handleError);
				} else if (options.method === 'DELETE') {
					return cordovaHTTP.delete(options.url, options.params, options.headers).then(handleSuccess, handleError);
				} else {
					$log.error('HTTP: Unknown method: ' + options.method);
					return $q.reject('Unknown method: ' + options.method);
				}
			} else {
				$log.debug('Making Angular HTTP call with options:' + angular.toJson(options));
				return $http(options);
			}
		});
	};

	var get = function(url, options) {
		if (!options) {
			options = {};
		}
		options.method = 'GET';
		options.url = url;
		return call(options);
	};

	var del = function(url, options) {
		if (!options) {
			options = {};
		}
		options.method = 'DELETE';
		options.url = url;
		return call(options);
	};

	var post = function(url, options) {
		if (!options) {
			options = {};
		}
		options.method = 'POST';
		options.url = url;
		return call(options);
	};

	var put = function(url, options) {
		if (!options) {
			options = {};
		}
		options.method = 'PUT';
		options.url = url;
		return call(options);
	};

	var createBasicAuthHeader = function(username, password) {
		return 'Basic ' + $window.btoa(username + ':' + password);
	};

	var getBasicAuth = function() {
		return basicAuth;
	};

	var useBasicAuth = function(username, password) {
		basicAuth = null;

		if (username) {
			basicAuth = {
				username: username,
				password: password
			};

			if (typeof username === 'object' && !password) {
				basicAuth = username;
			}

			if (basicAuth.username && basicAuth.password) {
				basicAuth.header = createBasicAuthHeader(basicAuth.username, basicAuth.password);
			}
		}

		return $q.when(basicAuth);
	};

	return {
		get: get,
		del: del,
		post: post,
		put: put,
		call: call,
		createBasicAuthHeader: createBasicAuthHeader,
		getBasicAuth: getBasicAuth,
		useBasicAuth: useBasicAuth
	};
});
