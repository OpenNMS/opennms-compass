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
				var ret = {
					label: res.label,
					id: parseInt(res.name, 10),
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

		return {
			resources: getResourcesForNode,
		};
	});

}());
