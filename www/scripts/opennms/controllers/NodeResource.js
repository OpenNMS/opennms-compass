(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.controllers.NodeResource', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Resources',
	])
	.controller('NodeResourceCtrl', function($q, $scope, ResourceService) {
		console.log('NodeResourceCtrl: initializing.');
		/*
		var sortFunction = function(a,b) {
			if (a.typeLabel) {
				return a.typeLabel.compareLocale(b.typeLabel);
			} else {
				return 0;
			}
		};

		$scope.refresh = function() {
			console.log('refreshing: ' + $scope.id);
			if ($scope.id) {
				ResourceService.resources($scope.id).then(function(ret) {
					$scope.label = ret.label;

					var lastLabel, resources = [], i, length, child;
					if (ret.children) {
						length = ret.children.length;
						for (i=0; i < length; i++) {
							child = ret.children[i];
							if (child.typeLabel !== lastLabel) {
								resources.push({
									isDivider: true,
									id: child.typeLabel,
								});
							}
							resources.push(child);
							lastLabel = child.typeLabel;
						}
					}
					$scope.resources = resources;
				}).finally(function() {
					console.log('refresh complete');
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
				$scope.id = nodeId;
			} else {
				console.log('NodeResourcesCtrl: unable to determine node from view.');
			}
			$scope.refresh();
		});

		$scope.$on('$ionicView.beforeLeave', function(ev, info) {
			if (info.direction === 'forward') {
				// we're going to the resources, keep the model in memory
			} else {
				console.log('NodeResourcesCtrl: leaving node view; cleaning up.');
				resetModel();
			}
		});
*/
	});

}());