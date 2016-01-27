(function() {
	'use strict';

	var angular = require('angular'),
		moment = require('moment'),
		Backshift = require('backshift/dist/backshift.onms'),
		$ = require('jquery');

	require('./NodeService');
	require('./ResourceService');

	require('../settings/SettingsService');

	var nodeResourceTemplate = require('ngtemplate!html!./node-resource.html');

	angular.module('opennms.controllers.NodeResource', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Nodes',
		'opennms.services.Resources',
		'opennms.services.Settings' // for default-graph-min-range
	])
	.config(function($stateProvider) {
		$stateProvider
		.state('node-resource', {
			url: '/nodes/:node/resource/:resource',
			templateUrl: nodeResourceTemplate,
			controller: 'NodeResourceCtrl'
		});
	})
	.controller('NodeResourceCtrl', function($q, $scope, $injector, $log, $timeout, $ionicScrollDelegate, $window, NodeService, ResourceService) {
		$log.info('NodeResourceCtrl: initializing.');

		var defaultRange = $injector.get('default-graph-range');

		var findElementById = function(id) {
			var elm, scrollEl, position = 0;
			elm = document.getElementById(id);
			if (elm) {
					scrollEl = angular.element(elm);
					while (scrollEl) {
							if (scrollEl.hasClass('scroll-content')) {
									break;
							}
							var offsetTop = scrollEl[0].offsetTop,
									scrollTop = scrollEl[0].scrollTop,
									clientTop = scrollEl[0].clientTop;
							position += offsetTop - scrollTop + clientTop;
							scrollEl = scrollEl.parent();
					}
					$log.debug('offset='+position);
					if (position < 10) {
							return 0;
					}
					return position;
			} else {
					$log.error('can\'t find element ' + id);
					return 0;
			}
		};

		$scope.favorites = {};
		$scope.range = {
		};
		$scope.range.end = new Date();
		$scope.range.start = new Date($scope.range.end.getTime() - defaultRange);

		$scope.getId = function(graph) {
			return 'graph-' + encodeURIComponent(graph.name);
		};

		$scope.display = {};

		$scope.calculateHeight = function(graph) {
			$scope.shouldDisplay(graph);
			return $scope.width + 80;
		};

		$scope.shouldDisplay = function(graph) {
			if (graph && graph.name) {
				var id = 'graph-' + graph.name;
				var el = $(document.getElementById(id));
				var visible = el.visible(true);
				if ($scope.display[id] !== visible) {
					$log.debug(graph.name + ': ' + $scope.display[id] + ' -> ' + visible);
				}
				$scope.display[id] = visible;
			}
			return true;
		};

		$scope.refresh = function() {
			$log.debug('refreshing: ' + $scope.resourceId);
			if ($scope.nodeId) {
				NodeService.get($scope.nodeId).then(function(node) {
					$scope.node = node;
				});
			}
			if ($scope.resourceId) {
				ResourceService.favorites().then(function(favorites) {
					var favorite,
						scopeFavorites = {};

					for (var i=0, len=favorites.length; i < len; i++) {
						favorite = favorites[i];
						if (favorite.resourceId === $scope.resourceId) {
							scopeFavorites[favorite.graphName] = favorite;
						}
					}
					$log.debug('got favorites: ' + angular.toJson(scopeFavorites));
					$scope.favorites = scopeFavorites;
				});
				ResourceService.graphNames($scope.resourceId).then(function(graphs) {
					var promises = [];
					for (var i=0, len=graphs.length; i < len; i++) {
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
			return $scope.favorites && $scope.favorites[graphName];
		};

		$scope.toggleFavorite = function(ev, graph) {
			ev.preventDefault();
			ev.stopPropagation();
			if ($scope.isFavorite(graph.name)) {
				ResourceService.unfavorite($scope.resourceId, graph.name).then(function(fav) {
					delete $scope.favorites[graph.name];
				});
			} else {
				ResourceService.favorite($scope.resourceId, graph.name, $scope.nodeId, $scope.node.label).then(function(fav) {
					$scope.favorites[graph.name] = fav;
				});
			}
		};

		$scope.isOpen = function(graphName) {
			return $scope.shown && $scope.shown.name && graphName && $scope.shown.name === graphName;
		};

		$scope.toggleOpen = function(graph) {
			if ($scope.shown && $scope.shown.name && graph && graph.name && $scope.shown.name === graph.name) {
				//$log.debug('hiding: ' + angular.toJson(graph));
				delete $scope.shown;
			} else {
				//$log.debug('showing: ' + angular.toJson(graph));
				$scope.shown = graph;
				$timeout(function() {
					$scope.$broadcast('scroll.refreshComplete');
					var position = findElementById('graph-' + graph.name);
					$log.debug('Found element position: ' + position);
					$ionicScrollDelegate.$getByHandle('node-resources-scroll').scrollTo(0, position, true);
				}, 500);
			}
		};

		var resetModel = function() {
			$scope.graphDefinitions = [];
			$scope.children = [];
			$scope.node = {};
		};

		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			$log.info('NodeResourceCtrl: entering node view.');
			//$log.debug('info=' + angular.toJson(info));
			if (info && info.stateParams) {
				if (info.stateParams.node) {
					var nodeId = parseInt(info.stateParams.node, 10);
					$scope.nodeId = nodeId;
				}
				if (info.stateParams.resource) {
					$scope.resourceId = info.stateParams.resource;
				}
				//$log.debug('node id = ' + $scope.nodeId + ', resource id = ' + $scope.resourceId);
			} else {
				$log.error('NodeResourcesCtrl: unable to determine node or resource from view.');
			}
			if (info && info.direction === 'forward') {
				$scope.refresh();
			}
		});

		$scope.$on('$ionicView.afterLeave', function(ev, info) {
			$log.debug('info=' + angular.toJson(info));
			if (info && info.direction === 'forward') {
				// we're going deeper, keep the model in memory
			} else if (info) {
				$log.debug('NodeResourceCtrl: leaving node resource view; cleaning up.');
				resetModel();
			}
		});
	});

}());
