(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.controllers.NodeResources', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Resources',
	])
	.controller('NodeResourcesCtrl', function($q, $scope, ResourceService) {
		console.log('NodeResourcesCtrl: initializing.');
	});

}());