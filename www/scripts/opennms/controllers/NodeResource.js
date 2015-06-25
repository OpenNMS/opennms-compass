(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.controllers.NodeResource', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Nodes',
		'opennms.services.Resources',
		'opennms.services.Settings',
	])
	.directive('onmsGraph', function(Settings) {
		return {
			scope: {
				resourceId: '=',
				graphDef: '=',
			},
			link: function($scope, element, attrs) {
				Settings.rest('measurements').then(function(rest) {
					console.log('graphing: resource id = ' + $scope.resourceId + ', graphDef = ' + angular.toJson($scope.graphDef));
					console.log('element=' + angular.toJson(element));

					var end = Date.now();
					var start = end - (8 * 60 * 60 * 1000); // 8 hours ago

					var rrdGraphConverter = new Backshift.Utilities.RrdGraphConverter({
						graphDef: $scope.graphDef,
						resourceId: $scope.resourceId,
					});
					var graphModel = rrdGraphConverter.model;
					var ds = new Backshift.DataSource.OpenNMS({
						url: rest.url,
						username: rest.username,
						password: rest.password,
						metrics: graphModel.metrics,
					});
					var graph = new Backshift.Graph.C3({
						element: $(element)[0],
						start: start,
						end: end,
						dataSource: ds,
						series: graphModel.series,
						step: true,
						title: graphModel.title,
						verticalLabel: graphModel.verticalLabel,
					});
					graph.render();
				});
			}
		};
	})
	.controller('NodeResourceCtrl', function($q, $scope, NodeService, ResourceService) {
		console.log('NodeResourceCtrl: initializing.');

		$scope.favorites = {};

		$scope.refresh = function() {
			console.log('refreshing: ' + $scope.resourceId);
			if ($scope.nodeId) {
				NodeService.get($scope.nodeId).then(function(node) {
					$scope.node = node;
				});
			}
			if ($scope.resourceId) {
				ResourceService.graphNames($scope.resourceId).then(function(graphs) {
					var promises = [], i, length = graphs.length;
					for (i=0; i < length; i++) {
						promises.push(ResourceService.graph(graphs[i]));
					}
					$q.all(promises).then(function(graphDefs) {
						$scope.graphDefinitions = graphDefs;
						if (graphDefs && graphDefs.length && graphDefs.length > 0) {
							$scope.shown = graphDefs[0];
						}
					});
				});
				ResourceService.resource($scope.resourceId).then(function(ret) {
					if (ret.children && ret.children.resource) {
						$scope.children = ResourceService.withDividers(ret.children.resource);
					}
					$scope.resource = ret;
				}).finally(function() {
					$scope.$broadcast('scroll.refreshComplete');
				});
			} else {
				$scope.$broadcast('scroll.refreshComplete');
			}
		};

		$scope.isFavorite = function(graphName) {
			return ($scope.favorites && $scope.favorites[graphName]);
		};

		$scope.toggleFavorite = function(ev, graph) {
			ev.preventDefault();
			ev.stopPropagation();
			if ($scope.isFavorite(graph.name)) {
				$scope.favorites[graph.name] = false;
			} else {
				$scope.favorites[graph.name] = true;
			}
		};

		$scope.isOpen = function(graphName) {
			return ($scope.shown && $scope.shown.name && graphName && $scope.shown.name === graphName);
		};

		$scope.toggleOpen = function(graph) {
			if ($scope.shown && $scope.shown.name && graph && graph.name && $scope.shown.name === graph.name) {
				console.log('hiding: ' + angular.toJson(graph));
				delete $scope.shown;
			} else {
				console.log('showing: ' + angular.toJson(graph));
				$scope.shown = graph;
			}
		};

		var resetModel = function() {
			$scope.graphDefinitions = [];
			$scope.children = [];
			$scope.node = {};
		};

		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			console.log('NodeResourceCtrl: entering node view.');
			console.log('info=' + angular.toJson(info));
			if (info && info.stateParams) {
				if (info.stateParams.node) {
					var nodeId = parseInt(info.stateParams.node, 10);
					$scope.nodeId = nodeId;
				}
				if (info.stateParams.resource) {
					$scope.resourceId = info.stateParams.resource;
				}
				console.log('node id = ' + $scope.nodeId + ', resource id = ' + $scope.resourceId);
			} else {
				console.log('NodeResourcesCtrl: unable to determine node or resource from view.');
			}
			$scope.refresh();
		});

		$scope.$on('$ionicView.beforeLeave', function(ev, info) {
			if (info.direction === 'forward') {
				// we're going deeper, keep the model in memory
			} else {
				console.log('NodeResourceCtrl: leaving node resource view; cleaning up.');
				resetModel();
			}
		});
	});

}());