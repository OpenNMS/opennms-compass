(function() {
	'use strict';

	/* global Backshift: true */
	/* global datePicker: true */
	/* global ionic: true */
	/* global moment: true */

	angular.module('opennms.services.Resources', [
		'ionic',
		'uuid4',
		'opennms.services.DB',
		'opennms.services.Rest',
		'opennms.services.Servers',
		'opennms.services.Util',
	])
	.directive('onmsGraph', function($log, $timeout, $window, $injector, Servers) {
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
				range: '=range',
				display: '=display',
			},
			replace: true,
			templateUrl: 'templates/onms-graph.html',
			link: function($scope, element, attrs) {
				$scope.width = getWidth();
				$scope.height = getWidth();
				if ($scope.display === undefined) {
					$scope.display = true;
				}

				var minDate = moment().subtract($injector.get('default-graph-min-range'), 'milliseconds').toDate();
				$scope.editDate = function(type) {
					var date;
					if (type === 'start') {
						date = $scope.range.start;
					} else {
						date = $scope.range.end;
					}
					datePicker.show({
						date: date,
						minDate: minDate,
						maxDate: moment().toDate(),
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
					if (!$scope.ds)                { return; }
					if (!$scope.graphModel)        { return; }
					if (!$scope.graphModel.series) { return; }
					if (!$scope.graphModel.title)  { return; }
					if (!$scope.range)             { return; }
					if (!$scope.range.start)       { return; }
					if (!$scope.range.end)         { return; }

					if ($scope.graph && $scope.graph._last) {
						if ($scope.graph._last.ds         === $scope.ds &&
							$scope.graph._last.graphModel === $scope.graphModel &&
							$scope.graph._last.width      === $scope.width &&
							$scope.graph._last.height     === $scope.height &&
							angular.equals($scope.graph._last.range, $scope.range)) {
							$log.debug('Graph is unchanged since last render.  Skipping.');
							return;
						}
					}

					var onmsGraphElement = angular.element(element).find('.graph').first();
					onmsGraphElement.width($scope.width);
					onmsGraphElement.height($scope.width);

					//var graph = new Backshift.Graph.DC({
					var graph = new Backshift.Graph.Flot({
						element: onmsGraphElement[0],
						start: $scope.range.start.getTime(),
						end: $scope.range.end.getTime(),
						width: $scope.width,
						height: $scope.width,
						interactive: false,
						dataSource: $scope.ds,
						series: $scope.graphModel.series,
						printStatements: $scope.graphModel.printStatements,
						title: $scope.graphModel.title,
						verticalLabel: $scope.graphModel.verticalLabel,
						exportIconSizeRatio: 0,
						beginOnRender: false,
						zoom: false,
						xaxisFont: {
							size: 10,
							family: 'sans-serif',
						},
						yaxisFont: {
							size: 10,
							family: 'sans-serif',
						},
						legendFontSize: 6,
						ticks: 4,
					});

					graph._last = {
						ds: $scope.ds,
						graphModel: $scope.graphModel,
						range: angular.copy($scope.range),
						width: $scope.width,
						height: $scope.width,
					};

					if ($scope.graph && $scope.graph.destroy) {
						$scope.graph.destroy();
						delete $scope.graph._last.ds;
						delete $scope.graph._last.graphModel;
						delete $scope.graph._last.range;
						delete $scope.graph._last.width;
						delete $scope.graph._last.height;
						delete $scope.graph._last;
					}

					$scope.graph = graph;

					$log.debug('Displaying graph: ' + $scope.resourceId + ' / ' + $scope.graphModel.title);
					$timeout(function() {
						graph.render();
						if ($scope.display) {
							graph.begin();
						}
					});
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

				$scope.refresh = function() {
					if ($scope.graph) {
						if ($scope.display) {
							$scope.graph.begin();
						} else {
							$scope.graph.cancel();
						}
					}
				};

				$scope.$watch('range', function(newRange, oldRange) {
					var startDate = moment(newRange && newRange.start? newRange.start : 0),
						endDate = moment(newRange && newRange.end? newRange.end : 0);
					if (oldRange && newRange.start !== oldRange.start) {
						if (startDate.isAfter(endDate)) {
							$scope.range.end = startDate.add(1, 'hour').toDate();
						}
					} else if (oldRange && newRange.end !== oldRange.end) {
						if (endDate.isBefore(startDate)) {
							$scope.range.start = endDate.subtract(1, 'hour').toDate();
						}
					}
					$scope.redraw();
				}, true);

				$scope.$watchGroup(['width', 'height'], $scope.redraw);
				$scope.$watch('display', $scope.refresh);

				$scope.$on('resize', function(ev, info) {
					$scope.width = info.width;
					$scope.height = info.height;
				});

				$scope.$watch('graphDef', function(graphDef) {
					if (graphDef && $scope.resourceId) {
						$scope.rrdGraphConverter = new Backshift.Utilities.RrdGraphConverter({
							graphDef: graphDef,
							resourceId: $scope.resourceId,
						});
					}
				});

				$scope.$watch('rrdGraphConverter', function(rrdGraphConverter) {
					if (rrdGraphConverter && rrdGraphConverter.model) {
						$scope.graphModel = rrdGraphConverter.model;
					}
				});

				$scope.$watch('graphModel', function(graphModel) {
					if (graphModel && graphModel.metrics) {
						Servers.getDefault().then(function(server) {
							if (server) {
								$scope.ds = new Backshift.DataSource.OpenNMS({
									url: server.restUrl('measurements'),
									username: server.username,
									password: server.password,
									metrics: graphModel.metrics,
								});
							}
						});
					}
				});

				$scope.$watch('ds', function() {
					$scope.redraw();
				});

				var cleanUp = function() {
					var resourceId = $scope.resourceId;
					var graphTitle = ($scope.graphModel && $scope.graphModel.title)? $scope.graphModel.title : 'N/A';
					$log.debug('Destroying graph: ' + resourceId + ' / ' + graphTitle);
					if ($scope.graph) {
						if ($scope.graph.destroy) {
							$scope.graph.destroy();
						}
						delete $scope.graph._last.ds;
						delete $scope.graph._last.graphModel;
						delete $scope.graph._last.range;
						delete $scope.graph._last;
						$scope.graph = undefined;
					}
				};

				$scope.$on('$destroy', cleanUp);
				element.on('$destroy', cleanUp);
			}
		};
	})
	.factory('ResourceService', function($q, $rootScope, $log, uuid4, db, RestService, Servers, util) {
		$log.info('ResourceService: Initializing.');

		var _graphs = {};
		var favoritesCollection = db.collection('resources', 'favorites', { transactional: true });

		var _sortFunction = function(a,b) {
			if (a.typeLabel && b.typeLabel) {
				return a.typeLabel.localeCompare(b.typeLabel);
			} else {
				return 0;
			}
		};
		var getResourcesForNode = function(nodeId) {
			return RestService.get('/resources/fornode/' + nodeId, {}, {'Accept': 'application/json'}).then(function(res) {
				//$log.debug('ResourceService.getResourcesForNode: res=' + angular.toJson(res));
				var ret = {
					label: res.label,
					id: parseInt(res.name, 10),
					children: [],
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

		var getResource = function(resourceId) {
			return RestService.get('/resources/' + encodeURIComponent(resourceId), {}, {'Accept': 'application/json'}).then(function(res) {
				if (res.children && res.children.resource) {
					if (angular.isArray(res.children.resource)) {
						res.children = res.children.resource;
					} else {
						res.children = [res.children.resource];
					}
				} else {
					res.children = [];
				}
				return res;
			});
		};

		var getGraphNames = function(resourceId) {
			return RestService.get('/graphs/for/' + encodeURIComponent(resourceId), {}, {'Accept': 'application/json'}).then(function(res) {
				if (res.name) {
					if (angular.isArray(res.name)) {
						return res.name;
					} else {
						return [res.name];
					}
				} else {
					return [];
				}
			});
		};

		var getGraph = function(graph) {
			if (!_graphs.hasOwnProperty(graph)) {
				_graphs[graph] = RestService.get('/graphs/' + graph, {}, {'Accept': 'application/json'});
			}
			return _graphs[graph];
		};

		var withDividers = function(resources) {
			if (resources && !angular.isArray(resources)) {
				resources = [resources];
			}
			if (!resources) {
				resources = [];
			}
			resources.sort(_sortFunction);

			var ret = [], child, lastLabel;
			for (var i=0, len=resources.length; i < len; i++) {
				child = resources[i];
				if (child.typeLabel !== lastLabel) {
					ret.push({
						isDivider: true,
						id: child.typeLabel,
					});
				}
				ret.push(child);
				lastLabel = child.typeLabel;
			}
			return ret;
		};

		var _getServer = function(caller) {
			return Servers.getDefault().then(function(server) {
				if (server && angular.isDefined(server.id) && angular.isDefined(server.username)) {
					return server;
				} else {
					return $q.reject('ResourceService.' + caller + ': Unable to determine default server.');
				}
			});
		};

		var getFavorites = function() {
			return _getServer('getFavorites').then(function(server) {
				return favoritesCollection.then(function(fc) {
					var chain = fc.chain();
					chain.where(function(obj) {
						return obj.server === server.id && obj.username === server.username;
					});
					chain.simplesort('time');
					return chain.data();
				});
			});
		};

		var getFavorite = function(resourceId, graphName) {
			return _getServer('getFavorite').then(function(server) {
				return  favoritesCollection.then(function(fc) {
					var favs = fc.where(function(obj) {
						return obj.server === server.id &&
							obj.username === server.username &&
							obj.resourceId === resourceId &&
							obj.graphName === graphName;
					});
					if (favs.length === 1) {
						return favs[0];
					} else if (favs.length > 1) {
						$log.warn('ResourceService.getFavorite: ' + favs.length + ' resources found for ' + resourceId + '/' + graphName + '.  Returning the first match.');
						return favs[0];
					} else {
						return undefined;
					}
				});
			});
		};

		var addFavorite = function(resourceId, graphName, nodeId, nodeLabel) {
			return _getServer('addFavorite').then(function(server) {
				var favorite = {
					id: uuid4.generate(),
					server: server.id,
					username: server.username,
					resourceId: resourceId,
					graphName: graphName,
					nodeId: nodeId,
					nodeLabel: nodeLabel,
					isFavorite: true,
					time: new Date().getTime(),
				};
				return favoritesCollection.then(function(fc) {
					fc.insert(favorite);
					return favorite;
				});
			});
		};

		var removeFavorite = function(resourceId, graphName) {
			return _getServer('removeFavorite').then(function(server) {
				return favoritesCollection.then(function(fc) {
					return fc.removeWhere(function(obj) {
							return obj.server === server.id &&
								obj.username === server.username &&
								obj.resourceId === resourceId &&
								obj.graphName === graphName;
						});
				});
			});
		};

		util.onServerRemoved(function(server) {
			$log.debug('ResourceService.onServerRemoved: cleaning up favorites for server ' + server.name);
			return favoritesCollection.then(function(fc) {
				return fc.removeWhere(function(obj) {
					return obj.server === server.id && obj.username === server.username;
				});
			});
		});

		return {
			graphNames: getGraphNames,
			graph: getGraph,
			resources: getResourcesForNode,
			resource: getResource,
			withDividers: withDividers,
			favorites: getFavorites,
			isFavorite: getFavorite,
			favorite: addFavorite,
			unfavorite: removeFavorite,
		};
	});

}());
