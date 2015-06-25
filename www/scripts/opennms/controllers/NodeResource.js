(function() {
	'use strict';

	/* global ionic: true */
	/* global datePicker: true */
	/* global moment: true */

	angular.module('opennms.controllers.NodeResource', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Nodes',
		'opennms.services.Resources',
		'opennms.services.Settings',
	])
	.directive('onmsGraph', function($timeout, $window, Settings) {
		var getWidth = function() {
			return $window.innerWidth;
		};
		var getHeight = function() {
			if ($window.orientation % 180 === 0) {
				return $window.innerWidth;
			} else {
				return $window.innerHeight - 140;
			}
		};
		return {
			scope: {
				resourceId: '=',
				graphDef: '=',
				range: '=?range',
			},
			replace: true,
			templateUrl: 'templates/onms-graph.html',
			link: function($scope, element, attrs) {
				$scope.width = getWidth();
				$scope.height = getHeight();
				if (!$scope.range.end) {
					$scope.range.end = new Date();
				}
				if (!$scope.range.start) {
					$scope.range.start = new Date($scope.range.end.getTime() - (8*60*60*1000)); // 8 hours ago
				}

				$scope.editDate = function(type) {
					var date;
					if (type === 'start') {
						date = $scope.range.start;
					} else {
						date = $scope.range.end;
					}
					datePicker.show({
						date: date,
						mode: 'datetime',
					}, function(newDate) {
						$scope.$evalAsync(function() {
							if (type === 'start') {
								$scope.range.start = newDate;
							} else {
								$scope.range.end = newDate;
							}
						});
					});
				};

				$scope.createGraph = function() {
					if (!$scope.ds || !$scope.graphModel) {
						return;
					}

					var graph = new Backshift.Graph.C3({
						element: $(element).find('.graph')[0],
						start: $scope.range.start.getTime(),
						end: $scope.range.end.getTime(),
						width: $scope.width,
						height: $scope.height,
						interactive: false,
						dataSource: $scope.ds,
						series: $scope.graphModel.series,
						step: true,
						title: $scope.graphModel.title,
						verticalLabel: $scope.graphModel.verticalLabel,
						exportIconSizeRatio: 0,
					});
					if ($scope.graph) {
						$scope.graph.destroy();
					}
					$scope.graph = graph;
					graph.render();
				};

				$scope.redraw = function() {
					$scope.dirty = true;
					$timeout(function() {
						if ($scope.dirty) {
							$scope.dirty = false;
							$scope.createGraph();
						}
					}, 50);
				};

				$scope.$watch('range', function(newRange, oldRange) {
					if (oldRange && newRange.start !== oldRange.start) {
						var startDate = moment(newRange.start);
						var endDate   = moment(newRange.end);
						if (startDate.isAfter(endDate)) {
							$scope.range.end = startDate.add(1, 'hour').toDate();
						}
					} else if (oldRange && newRange.end !== oldRange.end) {
						var startDate = moment(newRange.start);
						var endDate   = moment(newRange.end);
						if (endDate.isBefore(startDate)) {
							$scope.range.start = endDate.subtract(1, 'hour').toDate();
						}
					}
					$scope.redraw();
				});
				$scope.$watch('width', $scope.redraw);
				$scope.$watch('height', $scope.redraw);

				var rotationListener = function(ev) {
					if ($scope.graph) {
						$scope.$evalAsync(function() {
							$scope.width = getWidth();
							$scope.height = getHeight();
						});
					}
				};
				$window.addEventListener('orientationchange', rotationListener, false);

				Settings.rest('measurements').then(function(rest) {
					$scope.rrdGraphConverter = new Backshift.Utilities.RrdGraphConverter({
						graphDef: $scope.graphDef,
						resourceId: $scope.resourceId,
					});
					$scope.graphModel = $scope.rrdGraphConverter.model;
					$scope.ds = new Backshift.DataSource.OpenNMS({
						url: rest.url,
						username: rest.username,
						password: rest.password,
						metrics: $scope.graphModel.metrics,
					});

					$scope.createGraph();
				});
				element.on('$destroy', function() {
					console.log('destroying graph: ' + $scope.graphModel.title);
					if ($scope.graph) {
						$scope.graph.destroy();
						$scope.graph = undefined;
					}
					$window.removeEventListener('orientationchange', rotationListener, false);
				});
			}
		};
	})
	.controller('NodeResourceCtrl', function($q, $scope, NodeService, ResourceService) {
		console.log('NodeResourceCtrl: initializing.');

		$scope.favorites = {};
		$scope.range = {
		};
		$scope.range.end = new Date();
		$scope.range.start = new Date($scope.range.end.getTime() - (8*60*60*1000)); // 8 hours ago;

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