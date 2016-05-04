(function() {
	'use strict';

	var angular = require('angular'),
		moment = require('moment'),
		$ = require('jquery');

	var Constants = require('../misc/Constants'),
		TOP_POSITION = 0,
		DEFAULT_PAUSE = 500;

	require('angular-debounce');

	require('./NodeService');
	require('./ResourceService');

	require('../settings/SettingsService');

	require('../misc/Capabilities');
	require('../misc/OnmsGraph');
	require('../misc/util');

	var nodeResourceTemplate = require('ngtemplate!./node-resource.html');

	angular.module('opennms.controllers.NodeResource', [
		'ionic',
		'angularLocalStorage',
		'rt.debounce',
		'opennms.misc.OnmsGraph',
		'opennms.services.Capabilities',
		'opennms.services.Nodes',
		'opennms.services.Resources',
		'opennms.services.Settings', // for default-graph-min-range
		'opennms.services.Util'
	])
	.config(function($stateProvider) {
		$stateProvider
		.state('node-resource', {
			url: '/nodes/:node/resource/:resource',
			templateUrl: nodeResourceTemplate,
			controller: 'NodeResourceCtrl'
		});
	})
	.controller('NodeResourceCtrl', function($q, $scope, $injector, $log, $timeout, $ionicScrollDelegate, $window, Capabilities, debounce, NodeService, ResourceService, util) {
		$log.info('NodeResourceCtrl: initializing.');
		$scope.util = util;
		$scope.shouldRender = false;
		$scope.ready = {};
		$scope.graphBarHeight = 300;

		var defaultRange = $injector.get('default-graph-range');
		//var defaultRange = 60 * 60 * 1000;

		/* eslint-disable no-magic-numbers */
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
			}

			$log.error('can\'t find element ' + id);
			return 0;
		};
		/* eslint-enable no-magic-numbers */

		$scope.favorites = {};
		$scope.range = {
		};
		$scope.range.end = new Date();
		$scope.range.start = new Date($scope.range.end.getTime() - defaultRange);

		$scope.getId = function(graph) {
			return graph && graph.name? 'graph-' + encodeURIComponent(graph.name):undefined;
		};

		$scope.refreshGraphs = function() {
			$log.debug('refreshing: ' + $scope.resourceId);
			var promises = [];
			if ($scope.nodeId) {
				promises.push(NodeService.get($scope.nodeId).then(function(node) {
					$scope.node = node;
				}));
			} else {
				$log.warn('warning: no node ID!');
			}
			if ($scope.resourceId) {
				promises.push(ResourceService.favorites().then(function(favorites) {
					var favorite,
						scopeFavorites = {};

					for (var i=0, len=favorites.length; i < len; i++) {
						favorite = favorites[i];
						if (favorite.resourceId === $scope.resourceId) {
							scopeFavorites[favorite.graphName] = favorite;
						}
					}
					if (__DEVELOPMENT__) { $log.debug('got favorites: ' + angular.toJson(scopeFavorites)); }
					$scope.favorites = scopeFavorites;
					return scopeFavorites;
				}));
				promises.push(ResourceService.graphNames($scope.resourceId).then(function(graphs) {
					var p = [];
					for (var i=0, len=graphs.length; i < len; i++) {
						p.push(ResourceService.graph(graphs[i]));
					}
					$scope.ready = {};
					return $q.all(p).then(function(graphDefs) {
						$scope.graphDefinitions = graphDefs;
						if (graphDefs && graphDefs.length && graphDefs.length > 0) { // eslint-disable-line no-magic-numbers
							$scope.shown = graphDefs[0];
						}
					});
				}));
				promises.push(ResourceService.resource($scope.resourceId).then(function(ret) {
					if (ret.children && ret.children.resource) {
						$scope.children = ResourceService.withDividers(ret.children.resource);
					}
					$scope.resource = ret;
				}));
			} else {
				$log.warn('warning: no resource ID!');
			}
			return $q.all(promises).then(function() {
				$scope.$broadcast('opennms.refreshGraphs');
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});
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
				//if (__DEVELOPMENT__) { $log.debug('hiding: ' + angular.toJson(graph)); }
				delete $scope.shown;
			} else {
				//if (__DEVELOPMENT__) { $log.debug('showing: ' + angular.toJson(graph)); }
				$scope.shown = graph;
				$timeout(function() {
					$scope.$broadcast('scroll.refreshComplete');
					var position = findElementById('graph-' + graph.name);
					$log.debug('Found element position: ' + position);
					$ionicScrollDelegate.$getByHandle('node-resources-scroll').scrollTo(TOP_POSITION, position, true);
				}, DEFAULT_PAUSE);
			}
		};

		var resetData = function() {
			$scope.graphDefinitions = [];
			$scope.children = [];
			$scope.node = {};
		};

		$scope.$on('opennms.graph.rendered', function(ev, info) {
			$scope.ready[info.graph.name]++;

			var ready = Object.keys($scope.ready).sort();
			var graphs = $scope.graphDefinitions.map(function(def) {
				return def.name;
			}).sort();

			var gdlen = $scope.graphDefinitions.length;
			var difference = ready.difference(graphs);

			if (gdlen > 0 && difference.length === 0) { // eslint-disable-line no-magic-numbers
				if ($scope.shouldRender === false) {
					$scope.shouldRender = true;
					$scope.$broadcast('opennms.refreshGraphs');
				}
			} else {
				$scope.shouldRender = false;
			}
		});

		var delayedRefresh = debounce(DEFAULT_PAUSE, $scope.refreshGraphs);
		util.onInfoUpdated(delayedRefresh);
		util.onDefaultServerUpdated(delayedRefresh);

		util.onLowMemory('node-resource', function(currentView) {
			$log.debug('NodeResourceCtrl: resetting data because of low memory.');
			resetData();
		});

		var lazyReset;
		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			$timeout.cancel(lazyReset);
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
			$scope.refreshGraphs();
		});
		$scope.$on('$ionicView.afterLeave', function(ev, info) {
			if (Capabilities.lowMemory()) {
				resetData();
			} else {
				lazyReset = $timeout(function() {
					if (__DEVELOPMENT__) { $log.debug('ResourceController.afterLeave: info=' + angular.toJson(info)); }
					$log.debug('NodeResourceCtrl: leaving node resource view; cleaning up.');
					resetData();
				}, Constants.DEFAULT_TIMEOUT);
			}
		});
	});

}());
