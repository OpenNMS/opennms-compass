(function() {
	'use strict';

	/* global Resource: true */

	angular.module('opennms.services.Resources', [
		'ionic',
		'opennms.services.Rest'
	])
	.factory('ResourceService', function($q, RestService) {
		console.log('ResourceService: Initializing.');

		var getResourceForNode = function(nodeId) {
			var deferred = $q.defer();

			RestService.getXml('/resources/fornode/' + nodeId, {limit:0}).then(function(results) {
				var ret;
				if (results && results.resource) {
					ret = new Resource(results.resource);
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'ResourceService.getResourceForNode';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getGraphsForResource = function(resource) {
			var deferred = $q.defer();

			RestService.getXml('/graphs/for/' + encodeURIComponent(resource), {limit:0}).then(function(results) {
				var ret = [], i, len;
				if (results && results.names) {
					if (angular.isArray(results.names.name)) {
						len = results.names.name.length;
						for (i=0; i < len; i++) {
							ret.push(results.names.name[i]);
						}
					} else {
						ret.push(results.names.name);
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'ResourceService.getGraphsForResource';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getReport = function(report) {
			var deferred = $q.defer();

			RestService.get('/graphs/' + encodeURIComponent(report), {limit:0}, {'Accept': 'application/json'}).then(function(results) {
				deferred.resolve(results);
			}, function(err) {
				err.caller = 'ResourceService.getReport';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		return {
			get: getResourceForNode,
			graphs: getGraphsForResource,
			report: getReport,
		};
	});

}());
