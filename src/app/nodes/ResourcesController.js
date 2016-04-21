(function() {
	'use strict';

	var angular = require('angular');

	require('./ResourceService');

	require('../misc/Capabilities');
	require('../misc/util');

	var nodeResourcesTemplate = require('ngtemplate!./node-resources.html');

	var sortResources = function(a,b) {
		//$log.debug('sortResources: a=' + angular.toJson(a));
		//$log.debug('sortResources: b=' + angular.toJson(b));
		if (a.typeLabel) {
			if (b.typeLabel) {
				return a.typeLabel.localeCompare(b.typeLabel);
			} else {
				return -1;
			}
		} else {
			if (b.typeLabel) {
				return 1;
			} else {
				return 0;
			}
		}
	};

	angular.module('opennms.controllers.NodeResources', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Capabilities',
		'opennms.services.Resources',
		'opennms.services.Util'
	])
	.config(function($stateProvider) {
		$stateProvider
		.state('node-resources', {
			url: '/nodes/:node/resources',
			templateUrl: nodeResourcesTemplate,
			controller: 'NodeResourcesCtrl'
		});
	})
	.controller('NodeResourcesCtrl', function($log, $q, $scope, $timeout, Capabilities, ResourceService, util) {
		$log.info('NodeResourcesCtrl: initializing.');

		$scope.util = util;
		$scope.refresh = function() {
			$log.info('NodeResources.refresh: refreshing: ' + $scope.nodeId);
			if ($scope.nodeId) {
				ResourceService.resources($scope.nodeId).then(function(ret) {
					$scope.resourceLabel = ret.label;
					var children = ret.children;
					children.sort(sortResources);
					$scope.resources = ResourceService.withDividers(children);
				}, function(err) {
					$log.error('NodeResources.refresh: failed: ' + angular.toJson(err));
					return $q.reject(err);
				}).finally(function() {
					$scope.$broadcast('scroll.refreshComplete');
				});
			} else {
				$log.debug('NodeResources.refresh: no nodeId set.');
				$scope.$broadcast('scroll.refreshComplete');
			}
		};

		var resetData = function() {
			$scope.resources = [];
		};

		util.onLowMemory('node-resources', function(currentView) {
			$log.debug('NodeResourcesCtrl: resetting data because of low memory.');
			resetData();
		});

		var lazyReset;
		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			$timeout.cancel(lazyReset);
			if (info && info.stateParams && info.stateParams.node) {
				var nodeId = parseInt(info.stateParams.node, 10);
				$scope.nodeId = nodeId;
			} else {
				$log.error('NodeResourcesCtrl: unable to determine node from view.');
			}
			$scope.refresh();
		});
		$scope.$on('$ionicView.afterLeave', function() {
			if (Capabilities.lowMemory()) {
				resetData();
			} else {
				lazyReset = $timeout(resetData, 10000);
			}
		});
	});

}());
