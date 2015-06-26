(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Resources', [
		'ionic',
		'opennms.services.DB',
		'opennms.services.Rest',
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
					$scope.range.start = new Date($scope.range.end.getTime() - defaultRange); // 8 hours ago
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
						element: angular.element(element).find('.graph')[0],
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
					if ($scope.graph && $scope.graph.destroy) {
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
					var startDate = moment(newRange.start),
						endDate = moment(newRange.end);
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
					//console.log('destroying graph: ' + $scope.graphModel.title);
					if ($scope.graph) {
						$scope.graph.destroy();
						$scope.graph = undefined;
					}
					$window.removeEventListener('orientationchange', rotationListener, false);
				});
			}
		};
	})
	.factory('ResourceService', function($rootScope, db, RestService, Settings) {
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

		var _getFavoritesPrefix = function() {
			return Settings.server().then(function(server) {
				if (server.name && server.username) {
					return ['favorite', server.name, server.username].join(':');
				} else {
					return $q.reject('Server unconfigured.');
				}
			});
		};

		var getFavorites = function() {
			return _getFavoritesPrefix().then(function(prefix) {
				return db.find({
					selector: {
						$and: [
							{ _id: {'$gt': prefix+':'} },
							{ _id: {'$lt': prefix+':\uffff'} },
						]
					}
				}).then(function(found) {
					if (found && found.docs) {
						var i, favorite, id, chunks,
							ret = [],
							length = found.docs.length;
						for (i=0; i < length; i++) {
							favorite = found.docs[i];
							if (!favorite.resourceId) {
								var info = _getResourceInfo(prefix, favorite._id);
								angular.extend(favorite, info);
							}
							ret.push(favorite);
						}
						return ret;
					} else {
						return $q.reject('Docs missing.');
					}
				});
			});
		};

		var getFavorite = function(resourceId, graphName) {
			return _getFavoritesPrefix().then(function(prefix) {
				var docId = prefix + ':' + [resourceId, graphName].join(':');
				return db.get(docId);
			}).then(function(doc) {
				doc.resourceId = resourceId;
				doc.graphName = graphName;
				return doc;
			}, function() {
				// if it's not in the database, don't error, just return undefined
				return undefined;
			});
		};

		var addFavorite = function(resourceId, graphName) {
			return _getFavoritesPrefix().then(function(prefix) {
				var docId = prefix + ':' + [resourceId, graphName].join(':');

				return db.get(docId).then(function(doc) {
					console.log('ResourceService.addFavorite: got existing favorite: ' + angular.toJson(doc));
					return doc;
				}, function() {
					console.log('ResourceService.addFavorite: favorite does not exist');
					var doc = {
						_id: docId,
						isFavorite: true,
					};
					return db.put(doc).then(function(response) {
						doc._rev = response.rev;
						return doc;
					});
				});
			});
		};

		var removeFavorite = function(resourceId, graphName) {
			return _getFavoritesPrefix().then(function(prefix) {
				var docId = prefix + ':' + [resourceId, graphName].join(':');
				return db.get(docId);
			}).then(function(doc) {
				return db.remove(doc).then(function(err) {
					return doc;
				});
			});
		};

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
