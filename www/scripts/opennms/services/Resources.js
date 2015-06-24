(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Resources', [
		'ionic',
		'opennms.services.Rest',
	])
	.factory('ResourceService', function($rootScope, RestService) {
		console.log('ResourceService: Initializing.');

		var getResourcesForNode = function(nodeId) {
			return RestService.get('/resources/fornode/' + nodeId, {}, {'Accept': 'application/json'}).then(function(res) {
				if (res.children && res.children.resource) {
					if (angular.isArray(res.children.resource)) {
						return res.children.resource;
					} else {
						return [res.children.resource];
					}
				}
				return [];
			});
		};

		return {
			resources: getResourcesForNode,
		};
	});

}());
