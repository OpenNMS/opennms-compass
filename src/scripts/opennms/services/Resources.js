(function() {
	'use strict';

	/* global Backshift: true */
	/* global datePicker: true */
	/* global ionic: true */
	/* global moment: true */

	angular.module('opennms.services.Resources', [
		'ionic',
		'opennms.services.Rest',
		'opennms.services.Servers',
		'opennms.services.Storage',
		'opennms.services.Util',
	])
	.directive('onmsGraph', function($timeout, $window, Servers) {
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
			},
			replace: true,
			templateUrl: 'templates/onms-graph.html',
			link: function($scope, element, attrs) {
				$scope.width = getWidth();
				$scope.height = getHeight();

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
							$scope.graph._last.range      === $scope.range) {
							console.log('Graph is unchanged since last render.  Skipping.');
							return;
						}
					}

					var onmsGraphElement = angular.element(element).find('.graph').first();
					onmsGraphElement.width($scope.width);
					onmsGraphElement.height($scope.height);

					var graph = new Backshift.Graph.C3({
						element: onmsGraphElement[0],
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

					graph._last = {
						ds: $scope.ds,
						graphModel: $scope.graphModel,
						range: $scope.range
					};

					if ($scope.graph && $scope.graph.destroy) {
						$scope.graph.destroy();
						delete $scope.graph._last.ds;
						delete $scope.graph._last.graphModel;
						delete $scope.graph._last.range;
						delete $scope.graph._last;
					}

					$scope.graph = graph;

					console.log('Displaying graph: ' + $scope.resourceId + ' / ' + $scope.graphModel.title);
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
					$scope.createGraph();
				});

				var cleanUp = function() {
					var resourceId = $scope.resourceId;
					var graphTitle = ($scope.graphModel && $scope.graphModel.title)? $scope.graphModel.title : 'N/A';
					console.log('Destroying graph: ' + resourceId + ' / ' + graphTitle);
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
					$window.removeEventListener('orientationchange', rotationListener, false);
				};

				$scope.$on('$destroy', cleanUp);
				element.on('$destroy', cleanUp);
			}
		};
	})
	.factory('ResourceService', function($q, $rootScope, RestService, Servers, StorageService, util) {
		console.log('ResourceService: Initializing.');

		var _graphs = {};

		var _sortFunction = function(a,b) {
			if (a.typeLabel && b.typeLabel) {
				return a.typeLabel.localeCompare(b.typeLabel);
			} else {
				return 0;
			}
		};
		var getResourcesForNode = function(nodeId) {
			return RestService.get('/resources/fornode/' + nodeId, {}, {'Accept': 'application/json'}).then(function(res) {
				//console.log('ResourceService.getResourcesForNode: res=' + angular.toJson(res));
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

			var ret = [], i, child, lastLabel, length = resources.length;
			for (i=0; i < length; i++) {
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

		var _getResourceInfo = function(prefix, id) {
			if (id.startsWith(prefix)) {
				var sub = id.substring(prefix.length+1); // get the colon too
				var chunks = sub.split(':');
				var favorite = {};
				favorite.resourceId = chunks[0];
				favorite.graphName = chunks[1];
				return favorite;
			} else {
				return {};
			}
		};

		var _getFavoritesPrefixForServer = function(server) {
			if (server && angular.isDefined(server.id) && angular.isDefined(server.username)) {
				return ['favorite', server.id, encodeURIComponent(server.username)].join('_');
			} else {
				return $q.reject('Server unconfigured.');
			}
		};

		var _getFavoritesPrefix = function() {
			return Servers.getDefault().then(function(server) {
				return _getFavoritesPrefixForServer(server);
			});
		};

		var _getFavoritesFilename = function(resourceId, graphName) {
			return _getFavoritesPrefix().then(function(prefix) {
				return prefix + '_' + [encodeURIComponent(resourceId), encodeURIComponent(graphName)].join('_') + '.json';
			});
		};

		var getFavorites = function() {
			return _getFavoritesPrefix().then(function(prefix) {
				return StorageService.list('favorites').then(function(files) {
					var favorites = [], i, len = files.length, file;
					for (i=0; i < len; i++) {
						file = files[i];
						if (file.startsWith(prefix)) {
							console.log('ResourceService.getFavorites: matched file ' + file);
							favorites.push(StorageService.load('favorites/' + file));
						} else {
							console.log('ResourceService.getFavorites: ' + prefix + ' did not match file ' + file);
						}
					}
					return $q.all(favorites);
				});
			}).then(function(favorites) {
				console.log('ResourceService.getFavorites: found: ' + angular.toJson(favorites));
				return favorites;
				//return $q.reject('nope');
			});
		};

		var getFavorite = function(resourceId, graphName) {
			return _getFavoritesFilename(resourceId, graphName).then(function(filename) {
				return StorageService.load('favorites/' + filename);
			}).then(function(fav) {
				return fav;
			}, function() {
				// if it's not there, don't error, just return undefined
				return undefined;
			});
		};

		var addFavorite = function(resourceId, graphName, nodeId, nodeLabel) {
			return _getFavoritesFilename(resourceId, graphName).then(function(filename) {
				var fav = {
					_id: filename,
					resourceId: resourceId,
					graphName: graphName,
					nodeId: nodeId,
					nodeLabel: nodeLabel,
				};
				return StorageService.save('favorites/' + filename, fav);
			});
		};

		var removeFavorite = function(resourceId, graphName) {
			return _getFavoritesFilename(resourceId, graphName).then(function(filename) {
				return StorageService.remove('favorites/' + filename);
			}, function(err) {
				console.log('ResourceService.removeFavorite: failed: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		util.onServerRemoved(function(server) {
			console.log('ResourceService.onServerRemoved: cleaning up favorites for server ' + server.name);
			return StorageService.list('favorites').then(function(files) {
				var i, len = files.length, file, prefix = _getFavoritesPrefixForServer(server), operations = [];
				for (i=0; i < len; i++) {
					file = files[i];
					if (file.startsWith(prefix)) {
						console.log('ResourceService.onServerRemoved: * ' + file);
						operations.push(StorageService.remove('favorites/' + file));
					}
				}
				return $q.all(operations).then(function(result) {
					console.log('ResourceService.onServerRemoved: finished cleaning up favorites for server ' + server.name);
					return result;
				}, function(err) {
					console.log('ResourceService.onServerRemoved: failed: ' + angular.toJson(err));
					return $q.reject(err);
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
