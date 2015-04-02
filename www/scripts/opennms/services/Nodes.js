(function() {
	'use strict';

	/* global ionic: true */
	/* global Node: true */

	angular.module('opennms.services.Nodes', [
		'ionic',
		'opennms.services.Rest'
	])
	.factory('NodeService', ['$q', 'RestService', function($q, RestService) {
		console.log('NodeService: Initializing.');

		var searchNodes = function(search) {
			var deferred = $q.defer();

			var params = {
				'comparator': 'ilike',
				'match': 'any',
				'label': search + '%',
				'ipInterface.ipAddress': search + '%',
				'ipInterface.ipHostName': search + '%'
			};

			RestService.getXml('/nodes', params).then(function(results) {
				/* jshint -W069 */ /* "better written in dot notation" */
				var ret = [];
				if (results && results.nodes && results.nodes.node) {
					var nodes = results.nodes.node;
					if (!angular.isArray(nodes)) {
						nodes = [nodes];
					}
					for (var i=0; i < nodes.length; i++) {
						ret.push(new Node(nodes[i]));
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'NodeService.searchNodes';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getNode = function(nodeId) {
			var deferred = $q.defer();

			RestService.getXml('/nodes/' + nodeId).then(function(results) {
				var ret;
				if (results && results.node) {
					ret = new Node(results.node);
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'NodeService.getNode';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		return {
			search: searchNodes,
			get: getNode
		};
	}]);

}());
