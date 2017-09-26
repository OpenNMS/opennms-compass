'use strict';

require('Base64');
require('./Queue');

var module = angular.module('opennms.util.HTTP', [
	'ng',
	'opennms.misc.Queue'
]);

module.factory('HTTP', function($http, $injector, $interval, $log, $q, $window, Queue) {
	var requestTimeout = 10000;
	var enableCachebusting = false;
	var basicAuth = null;

	var ready;
	var initialize = function() {
		var deferred = $q.defer();

		ionic.Platform.ready(function() {
			console.log('HTTP: ready');
			if (cordova.plugin.http) {
				console.log('HTTP: Cordova HTTP is available.');
				cordova.plugin.http.enableSSLPinning(false);
				cordova.plugin.http.acceptAllCerts(true);
				cordova.plugin.http.validateDomainName(false);
				cordova.plugin.http.setRequestTimeout(requestTimeout / 1000.0);
				cordova.plugin.http.setDataSerializer('json');
				deferred.resolve(cordova.plugin.http);
			} else {
				console.log('HTTP: Cordova HTTP is not available.');
				deferred.resolve(undefined);
			}
		});

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
		console.log('call(): parameters=' + JSON.stringify(passedOptions));
		var options = angular.merge({}, defaultOptions, passedOptions);

		if (!ready) {
			ready = initialize();
		}

		return ready.then(function(cordovaHTTP) {
			if (options.url.indexOf('http') !== 0) { // eslint-disable-line no-magic-numbers
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
				//$log.debug('HTTP.call: setting Authorization header to ' + basicAuth.header);
				options.headers.Authorization = basicAuth.header;
			}

			if (cordovaHTTP) {
				if (__DEVELOPMENT__) { $log.debug('Making Cordova HTTP call with options:' + angular.toJson(options)); }
				var deferred = $q.defer();

				var handleSuccess = function(response) {
					//$log.debug('HTTP.handleSuccess: ' + angular.toJson(response.data));
					return deferred.resolve(response);
				};
				var handleError = function(err) {
					$log.error('HTTP.handleError: ' + options.url + ': ' + angular.toJson(err));
					return deferred.reject(err);
				};

				if (options.method === 'GET') {
					cordovaHTTP.get(options.url, options.params, options.headers, handleSuccess, handleError);
					return deferred.promise;
				} else if (options.method === 'HEAD') {
					cordovaHTTP.head(options.url, options.params, options.headers, handleSuccess, handleError);
					return deferred.promise;
				} else if (options.method === 'PUT') {
					options.params = angular.extend({}, options.data, options.params);
					cordovaHTTP.put(options.url, options.params, options.headers, handleSuccess, handleError);
					return deferred.promise;
				} else if (options.method === 'POST') {
					options.params = angular.extend({}, options.data, options.params);
					cordovaHTTP.post(options.url, options.params, options.headers, handleSuccess, handleError);
					return deferred.promise;
				} else if (options.method === 'DELETE') {
					cordovaHTTP.delete(options.url, options.params, options.headers, handleSuccess, handleError);
					return deferred.promise;
				}

				$log.error('HTTP: Unknown method: ' + options.method);
				return deferred.reject('Unknown method: ' + options.method);
			}

			// No cordovaHTTP, fall through to Angular
			if (__DEVELOPMENT__) { $log.debug('Making Angular HTTP call with options:' + angular.toJson(options)); }
			return $http(options);
		});
	};

	var httpQueue = Queue.create({
		name: 'HTTP',
		maxRequests: 8
	});

	var queuedCall = function(options) {
		return httpQueue.add(function queueAdd() {
			return call(options);
		});
	};

	var get = function(url, _options) {
		var options = _options || {};
		options.method = 'GET';
		options.url = url;
		return httpQueue.add(function callGet() {
			return call(options);
		});
	};

	var del = function(url, _options) {
		var options = _options || {};
		options.method = 'DELETE';
		options.url = url;
		return httpQueue.add(function callDelete() {
			return call(options);
		});
	};

	var post = function(url, _options) {
		var options = _options || {};
		options.method = 'POST';
		options.url = url;
		return httpQueue.add(function callPost() {
			return call(options);
		});
	};

	var put = function(url, _options) {
		var options = _options || {};
		options.method = 'PUT';
		options.url = url;
		return httpQueue.add(function callPut() {
			return call(options);
		});
	};

	var clearCookies = function() {
		return ready.then(function(cordovaHTTP) {
			cordovaHTTP.clearCookies();
			return true;
		}).catch(function(err) {
			$log.warn('Failed to clear cookies: ' + JSON.stringify(err));
			return false;
		});
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
				$http.defaults.headers.common.Authorization = basicAuth.header;
			}
		} else {
			delete $http.defaults.headers.common.Authorization;
		}

		return $q.when(basicAuth);
	};

	return {
		get: get,
		del: del,
		post: post,
		put: put,
		call: queuedCall,
		callImmediately: call,
		createBasicAuthHeader: createBasicAuthHeader,
		getBasicAuth: getBasicAuth,
		useBasicAuth: useBasicAuth
	};
});
