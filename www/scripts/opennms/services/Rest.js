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

	.factory('RestService', function($q, $http, $rootScope, $window, cordovaHTTP, Settings, util) {
		console.log('RestService: Initializing.');

		var useCordovaHTTP = false;
		var requestTimeout = 10000;
		var x2js = new X2JS();

		if ($window.cordova && cordovaHTTP && ionic.Platform.isAndroid()) {
		//if ($window.cordova && cordovaHTTP) {
			useCordovaHTTP = true;
			cordovaHTTP.acceptAllCerts(true);
			cordovaHTTP.setTimeouts(requestTimeout, requestTimeout);
		}

		var updateAuthorization = function() {
			var username = Settings.username();
			var password = Settings.password();
			//console.log('username=' + username +', password=' + password);
			if (username === undefined || password === undefined) {
				console.log('RestService.updateAuthorization: username or password not set.');
				delete $http.defaults.headers.common['Authorization'];
			} else {
				//console.log('RestService.updateAuthorization: setting basic auth with username "' + username + '".');
				$http.defaults.headers.common['Authorization'] = 'Basic ' + $window.btoa(username + ':' + password);
				cordovaHTTP.useBasicAuth(username, password).then(function() {
					console.log('RestService.updateAuthorization: configured basic auth with username "' + username + '".');
				}, function(err) {
					console.log('RestService.updateAuthorization: failed to configure basic auth with username "' + username + '".');
				});
			}
		};

		var getUrl = function(restFragment) {
			var url = Settings.restURL();
			if (url === undefined) {
				return undefined;
			}
			url = url.replace(/\/$/, '');
			if (!restFragment.startsWith('/')) {
				restFragment = '/' + restFragment;
			}
			return url + restFragment;
		};

		var encodeData = function(data) {
			return Object.keys(data).map(function(key) {
				return [key, data[key]].map(encodeURIComponent).join("=");
			}).join("&");
		};

		var doQuery = function(method, restFragment, params, headers) {
			var deferred = $q.defer();
			var url = getUrl(restFragment);

			if (!Settings.isServerConfigured()) {
				deferred.reject(new RestError(url, undefined, 0, 'Server information is not complete.'));
				return deferred.promise;
			}

			if (!params) {
				params = {};
			}
			if (!headers) {
				headers = {};
			}
			if (!headers['Accept']) {
				headers['Accept'] = 'application/xml';
			}

			var myparams = angular.extend({}, { limit: Settings.restLimit() }, params);
			if (myparams.limit === 0) {
				delete myparams.limit;
			}

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
			var deferred = $q.defer();
			var url = getUrl(restFragment);

			if (!Settings.isServerConfigured()) {
				deferred.reject(new RestError(url, undefined, 0, 'Server information is not complete.'));
				return deferred.promise;
			}

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
