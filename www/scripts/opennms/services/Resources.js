(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Resources', [
		'ionic',
		'opennms.services.Rest',
	])
	.factory('ResourceService', function($rootScope, RestService) {
		console.log('ResourceService: Initializing.');

		var _graphs = {};

		var _sortFunction = function(a,b) {
			if (a.typeLabel && b.typeLabel) {
				return a.typeLabel.localeCompare(b.typeLabel);
			} else {
				return 0;
			}
		};
		var getResourcesForNode = function(nodeId) {
			return RestService.get('/resources/fornode/' + nodeId, {}, {'Accept': 'application/json'}).then(function(res) {
				var ret = {
					label: res.label,
					id: parseInt(res.name, 10),
					children: [],
				};

				if (res.children && res.children.resource) {
					if (angular.isArray(res.children.resource)) {
						ret.children = res.children.resource;
					} else {
						ret.children = [res.children.resource];
					}
				}

				return ret;
			});
		};

		var getResource = function(resourceId) {
			return RestService.get('/resources/' + encodeURIComponent(resourceId), {}, {'Accept': 'application/json'}).then(function(res) {
				if (res.children && res.children.resource) {
					if (angular.isArray(res.children.resource)) {
						res.children = res.children.resource;
					} else {
						res.children = [res.children.resource];
					}
				} else {
					res.children = [];
				}
				return res;
			});
		};

		var getGraphNames = function(resourceId) {
			return RestService.get('/graphs/for/' + encodeURIComponent(resourceId), {}, {'Accept': 'application/json'}).then(function(res) {
				if (res.name) {
					if (angular.isArray(res.name)) {
						return res.name;
					} else {
						return [res.name];
					}
				} else {
					return [];
				}
			});
		};

		var getGraph = function(graph) {
			if (!_graphs.hasOwnProperty(graph)) {
				_graphs[graph] = RestService.get('/graphs/' + graph, {}, {'Accept': 'application/json'});
			}
			return _graphs[graph];
		};

		var withDividers = function(resources) {
			if (resources && !angular.isArray(resources)) {
				resources = [resources];
			}
			if (!resources) {
				resources = [];
			}
			resources.sort(_sortFunction);

			var ret = [], i, child, lastLabel, length = resources.length;
			for (i=0; i < length; i++) {
				child = resources[i];
				if (child.typeLabel !== lastLabel) {
					ret.push({
						isDivider: true,
						id: child.typeLabel,
					});
				}
				ret.push(child);
				lastLabel = child.typeLabel;
			}
			return ret;
		};

		return {
			graphNames: getGraphNames,
			graph: getGraph,
			resources: getResourcesForNode,
			resource: getResource,
			withDividers: withDividers,
		};
	});

}());
