(function() {
	'use strict';

	/* global ionic: true */
	/* global datePicker: true */
	/* global moment: true */
	/* global Backshift: true */

	var defaultRange = 1 * 60 * 60 * 1000; // 1 hour

	angular.module('opennms.controllers.NodeResource', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Nodes',
		'opennms.services.Resources',
		'opennms.services.Settings',
	])
	.controller('NodeResourceCtrl', function($q, $scope, NodeService, ResourceService) {
		console.log('NodeResourceCtrl: initializing.');

		$scope.favorites = {};
		$scope.range = {
		};
		$scope.range.end = new Date();
		$scope.range.start = new Date($scope.range.end.getTime() - defaultRange);

		$scope.refresh = function() {
			console.log('refreshing: ' + $scope.resourceId);
			if ($scope.nodeId) {
				NodeService.get($scope.nodeId).then(function(node) {
					$scope.node = node;
				});
			}
			if ($scope.resourceId) {
				ResourceService.favorites().then(function(favorites) {
					var i, favorite,
						scopeFavorites = {},
						length = favorites.length;

					for (i=0; i < length; i++) {
						favorite = favorites[i];
						if (favorite.resourceId === $scope.resourceId) {
							scopeFavorites[favorite.graphName] = favorite;
						}
					}
					console.log('got favorites: ' + angular.toJson(scopeFavorites));
					$scope.favorites = scopeFavorites;
				});
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
				ResourceService.unfavorite($scope.resourceId, graph.name).then(function(fav) {
					delete $scope.favorites[graph.name];
					return fav.isFavorite || false;
				});
			} else {
				ResourceService.favorite($scope.resourceId, graph.name, $scope.nodeId, $scope.node.label).then(function(fav) {
					$scope.favorites[graph.name] = fav;
					return fav.isFavorite || false;
				});
			}
		};

		$scope.isOpen = function(graphName) {
			return ($scope.shown && $scope.shown.name && graphName && $scope.shown.name === graphName);
		};

		$scope.toggleOpen = function(graph) {
			if ($scope.shown && $scope.shown.name && graph && graph.name && $scope.shown.name === graph.name) {
				//console.log('hiding: ' + angular.toJson(graph));
				delete $scope.shown;
			} else {
				//console.log('showing: ' + angular.toJson(graph));
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
			//console.log('info=' + angular.toJson(info));
			if (info && info.stateParams) {
				if (info.stateParams.node) {
					var nodeId = parseInt(info.stateParams.node, 10);
					$scope.nodeId = nodeId;
				}
				if (info.stateParams.resource) {
					$scope.resourceId = info.stateParams.resource;
				}
				//console.log('node id = ' + $scope.nodeId + ', resource id = ' + $scope.resourceId);
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