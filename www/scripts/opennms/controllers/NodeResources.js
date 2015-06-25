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

		var sortFunction = function(a,b) {
			if (a.typeLabel) {
				return a.typeLabel.compareLocale(b.typeLabel);
			} else {
				return 0;
			}
		};

		$scope.refresh = function() {
			console.log('refreshing: ' + $scope.nodeId);
			if ($scope.nodeId) {
				ResourceService.resources($scope.nodeId).then(function(ret) {
					$scope.resourceLabel = ret.label;
					$scope.resources = ResourceService.withDividers(ret.children);
				}).finally(function() {
					$scope.$broadcast('scroll.refreshComplete');
				});
			} else {
				$scope.$broadcast('scroll.refreshComplete');
			}
		};

		var resetModel = function() {
			$scope.resources = [];
		};

		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			console.log('NodeResourcesCtrl: entering node view.');
			if (info && info.stateParams && info.stateParams.node) {
				var nodeId = parseInt(info.stateParams.node, 10);
				$scope.nodeId = nodeId;
			} else {
				console.log('NodeResourcesCtrl: unable to determine node from view.');
			}
			$scope.refresh();
		});

		$scope.$on('$ionicView.beforeLeave', function(ev, info) {
			if (info.direction === 'forward') {
				// we're going deeper, keep the model in memory
			} else {
				console.log('NodeResourcesCtrl: leaving node view; cleaning up.');
				resetModel();
			}
		});
	});

}());