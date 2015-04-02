(function() {
	'use strict';

	/* global ionic: true */
	/* global X2JS: true */
	/* global RestError: true */

	angular.module('opennms.services.Rest', [
		'ng',
		'opennms.services.Settings',
	])

   	.factory('RestService', ['$q', '$http', '$rootScope', '$window', 'Settings', function($q, $http, $rootScope, $window, Settings) {
		console.log('RestService: Initializing.');

		var x2js = new X2JS();
		/* jshint -W069 */ /* "better written in dot notation" */
		$http.defaults.headers.common['Accept'] = 'application/xml';

		var updateAuthorization = function() {
			var username = Settings.username();
			var password = Settings.password();
			console.log('username=' + username +', password=' + password);
			if (username === undefined || password === undefined) {
				console.log('RestService.updateAuthorization: username or password not set.');
				delete $http.defaults.headers.common['Authorization'];
			} else {
				console.log('RestService.updateAuthorization: setting basic auth with username "' + username + '".');
				$http.defaults.headers.common['Authorization'] = 'Basic ' + $window.btoa(username + ':' + password);
			}
		};

		$rootScope.$on('opennms.settings.changed', function() {
			updateAuthorization();
		});
		updateAuthorization();

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

			var myparams = angular.extend({}, { limit: Settings.restLimit() }, params);
			if (myparams.limit === 0) {
				delete myparams.limit;
			}
			$http({
				method: method,
				url: url,
				params: myparams,
				headers: headers,
				withCredentials: true,
				timeout: 10000,
			}).success(function(data) {
				//console.log('Rest.doQuery:',data);
				deferred.resolve(data);
			}).error(function(data, status, headers, config, statusText) {
				deferred.reject(new RestError(url, data, status, statusText));
			});

			return deferred.promise;
		};

		var doGet = function(restFragment, params, headers) {
			return doQuery('GET', restFragment, params, headers);
		};

		var doPut = function(restFragment, params, headers) {
			return doQuery('PUT', restFragment, params, headers);
		};

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
			put: doPut
		};
	}]);

}());
