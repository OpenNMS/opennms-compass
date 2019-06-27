(function() {
	'use strict';

	var angular = require('angular'),
		Node = require('./models/Node');

	var Constants = require('../misc/Constants');

	require('../misc/Info');
	require('../misc/Rest');

	angular.module('opennms.services.Nodes', [
		'ionic',
		'opennms.services.Info',
		'opennms.services.Rest'
	])
	.factory('NodeService', function($q, $log, Info, RestService) {
		$log.info('NodeService: Initializing.');

		var searchNodes = function(search, limit) {
			var params = {
				comparator: 'ilike',
				match: 'any'
			};

			if (search) {
				params.label = '%' + search + '%';
				params['ipInterface.ipAddress'] = '%' + search + '%';
				params['ipInterface.ipHostName'] = '%' + search + '%';
			}

			if (limit) {
				params.limit = limit;
			}

			return RestService.getXml('/nodes', params).then((results) => {
				if (results && results.node_asArray) {
					return results.node_asArray.map((node) => new Node(node));
				}
				throw new Error('Invalid response.');
			}).catch(function(err) {
				err.caller = 'NodeService.searchNodes';
				return $q.reject(err);
			});
		};

		var getNode = function(nodeId) {
			return RestService.getXml('/nodes/' + nodeId).then(function(results) {
				if (results && results.id) {
					return new Node(results);
				}
				throw new Error('Invalid response.');
			}).catch(function(err) {
				err.caller = 'NodeService.getNode';
				return $q.reject(err);
			});
		};

		var setLocation = function(node, longitude, latitude) {
			return RestService.put('/nodes/' + node.id + '/assetRecord', {
				'geolocation.longitude': longitude,
				'geolocation.latitude': latitude
			}).then(() => {
				return true;
			}).catch((err) => {
				if (err.toString().contains('request was redirected')) {
					return true;
				} else if (err.status === Constants.HTTP_BAD_REQUEST || err.status === 0) { // eslint-disable-line no-magic-numbers
					return true;
				}
				err.caller = 'NodeService.setLocation';
				return $q.reject(err);
		});
		};

		var getNodes = function(params) {
			return RestService.getXml('/nodes', params).then(function(results) {
				if (results && results.node_asArray) {
					return results.node_asArray.map((node) => new Node(node));
				}
				throw new Error('Invalid response.');
			}).catch(function(err) {
				err.caller = 'NodeService.getNodes';
				return $q.reject(err);
			});
		};

		return {
			search: searchNodes,
			get: getNode,
			nodes: getNodes,
			setLocation: setLocation
		};
	});

}());
