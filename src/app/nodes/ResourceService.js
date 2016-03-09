(function() {
	'use strict';

	var angular = require('angular'),
		Backshift = require('backshift/dist/backshift.onms'),
		moment = require('moment'),
		RestError = require('../misc/RestError');

	require('../db/db');
	require('../servers/Servers');
	require('../settings/SettingsService');

	require('../misc/Rest');
	require('../misc/util');

	var onmsGraphTemplate = require('ngtemplate!html!./onms-graph.html');

	angular.module('opennms.services.Resources', [
		'ionic',
		'uuid4',
		'opennms.services.DB',
		'opennms.services.Rest',
		'opennms.services.Servers',
		'opennms.services.Settings', // for default-graph-min-range
		'opennms.services.Util'
	])
	.directive('onmsGraph', function($log, $timeout, $window, $injector, RestService, Servers) {
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
				display: '=display'
			},
			replace: true,
			templateUrl: onmsGraphTemplate,
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
					$window.datePicker.show({
						date: date,
						minDate: minDate,
						maxDate: moment().toDate(),
						mode: 'datetime'
					}, function(newDate) {
						if (!newDate) {
							return;
						}
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
						model: $scope.graphModel,
						exportIconSizeRatio: 0,
						beginOnRender: false,
						zoom: false,
						xaxisFont: {
							size: 10,
							family: 'sans-serif'
						},
						yaxisFont: {
							size: 10,
							family: 'sans-serif'
						},
						legendFontSize: 16,
						ticks: 4
					});

					graph._last = {
						ds: $scope.ds,
						graphModel: $scope.graphModel,
						range: angular.copy($scope.range),
						width: $scope.width,
						height: $scope.width
					};

					if ($scope.graph && $scope.graph.destroy) {
						$scope.graph.destroy();
						delete $scope.graph._last.graphModel;
						delete $scope.graph._last.ds;
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
						} else {
							graph.onQuerySuccess();
						}
						$scope.$broadcast('scroll.refreshComplete');
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
							resourceId: $scope.resourceId
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
								var options = {
									url: server.restUrl('measurements'),
									username: server.username,
									password: server.password,
									metrics: graphModel.metrics
								};

								var cordovaHTTP;
								if ($injector.has('cordovaHTTP')) {
									cordovaHTTP = $injector.get('cordovaHTTP');
								}
								if (cordovaHTTP) {
									options.fetchFunction = function(url, data, success, failure) {
										cordovaHTTP.post(url, data, {
											'Content-Type': 'application/json',
											Accept: 'application/json'
										}).then(function(response) {
											//$log.debug('cordovaHTTP response: ' + angular.toJson(response));
											success(response.data);
										}, function(err) {
											var error = new RestError(url, err.data, err.status);
											$log.error('cordovaHTTP error: ' + error.toString());
											failure(error.toString());
										});
									};
								}

								$scope.ds = new Backshift.DataSource.OpenNMS(options);
							}
						});
					}
				});

				$scope.$watch('ds', function() {
					$scope.redraw();
				});

				var cleanUp = function() {
					var resourceId = $scope.resourceId;
					var graphTitle = $scope.graphModel && $scope.graphModel.title? $scope.graphModel.title : 'N/A';
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
	.factory('ResourceService', function($q, $rootScope, $log, uuid4, RestService, Servers, db, util) {
		$log.info('ResourceService: Initializing.');

		var _graphs = {};

		var favoritesDB = db.get('favorites');
		favoritesDB.createIndex({
			index: {
				fields: ['server', 'username']
			}
		}).catch(function(err) {
			$log.error('Unable to create server/username index: ' + angular.toJson(err));
		});
		favoritesDB.createIndex({
			index: {
				fields: ['time', 'server', 'username']
			}
		}).catch(function(err) {
			$log.error('Unable to create server/username index: ' + angular.toJson(err));
		});
		favoritesDB.createIndex({
			index: {
				fields: ['server', 'username', 'resourceId', 'graphName']
			}
		}).catch(function(err) {
			$log.error('Unable to create server/username/resourceId/graphName index: ' + angular.toJson(err));
		});

		var _sortFunction = function(a,b) {
			if (a.typeLabel && b.typeLabel) {
				return a.typeLabel.localeCompare(b.typeLabel);
			} else {
				return 0;
			}
		};
		var getResourcesForNode = function(nodeId) {
			return RestService.get('/resources/fornode/' + nodeId, {}, {Accept: 'application/json'}).then(function(res) {
				//$log.debug('ResourceService.getResourcesForNode: res=' + angular.toJson(res));
				var ret = {
					label: res.label,
					id: parseInt(res.name, 10),
					children: []
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
			return RestService.get('/resources/' + encodeURIComponent(resourceId), {}, {Accept: 'application/json'}).then(function(res) {
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
			return RestService.get('/graphs/for/' + encodeURIComponent(resourceId), {}, {Accept: 'application/json'}).then(function(res) {
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
				_graphs[graph] = RestService.get('/graphs/' + graph, {}, {Accept: 'application/json'});
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
						id: child.typeLabel
					});
				}
				ret.push(child);
				lastLabel = child.typeLabel;
			}
			return ret;
		};

		var _getServer = function(caller) {
			return Servers.getDefault().then(function(server) {
				if (server && angular.isDefined(server._id) && angular.isDefined(server.username)) {
					return server;
				} else {
					return $q.reject('ResourceService.' + caller + ': Unable to determine default server.');
				}
			});
		};

		var getFavorites = function() {
			//$log.debug('ResourceService.getFavorites()');
			return _getServer('getFavorites').then(function(server) {
				return favoritesDB.find({
					selector: {
						server: server._id,
						username: server.username,
						time: {$gt: null}
					},
					sort: [{
						time: 'asc'
					}]
				}).then(function(result) {
					//$log.debug('ResourceService.getFavorites(): result=' + angular.toJson(result));
					if (result && result.docs) {
						return result.docs;
					} else {
						return [];
					}
				}).catch(function(err) {
					$log.error('ResourceService.getFavorites(): err=' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		var getFavorite = function(resourceId, graphName) {
			//$log.debug('ResourceService.getFavorite(' + resourceId + ',' + graphName + ')');
			return _getServer('getFavorite').then(function(server) {
				return favoritesDB.find({
					selector: {
						server: server._id,
						username: server.username,
						resourceId: resourceId,
						graphName: graphName
					}
				}).then(function(result) {
					//$log.debug('ResourceService.getFavorite(' + resourceId + ',' + graphName + '): result=' + angular.toJson(result));
					if (result && result.docs && result.docs.length === 1) {
						return result.docs[0];
					} else {
						$log.error('getFavorite(' + resourceId + ',' + graphName + '): failed result: ' + angular.toJson(result));
						return undefined;
					}
				}).catch(function(err) {
					$log.error('ResourceService.getFavorite('+resourceId+','+graphName+'): err=' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		var addFavorite = function(resourceId, graphName, nodeId, nodeLabel) {
			return _getServer('addFavorite').then(function(server) {
				var favorite = {
					_id: uuid4.generate(),
					server: server._id,
					username: server.username,
					resourceId: resourceId,
					graphName: graphName,
					nodeId: nodeId,
					nodeLabel: nodeLabel,
					isFavorite: true,
					time: new Date().getTime()
				};
				//$log.debug('ResourceService.addFavorite(' + resourceId + ',' + graphName + '): ' + angular.toJson(favorite));
				return favoritesDB.put(favorite).then(function(result) {
					//$log.debug('ResourceService.addFavorite(' + resourceId + ',' + graphName + '): result=' + angular.toJson(result));
					favorite._rev = result.rev;
					return favorite;
				}).catch(function(err) {
					$log.error('ResourceService.addFavorite(' + resourceId + ',' + graphName + ') failed: err=' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		var removeFavorite = function(resourceId, graphName) {
			//$log.debug('ResourceService.removeFavorite(' + resourceId + ',' + graphName + ')');
			return _getServer('removeFavorite').then(function(server) {
				return favoritesDB.find({
					selector: {
						server: server._id,
						username: server.username,
						resourceId: resourceId,
						graphName: graphName
					}
				}).then(function(result) {
					//$log.debug('ResourceService.removeFavorite(' + resourceId + ',' + graphName + '): result=' + angular.toJson(result));
					if (result && result.docs && result.docs.length === 1) {
						return favoritesDB.remove(result.docs[0]);
					} else {
						$log.error('removeFavorite: unhandled result: ' + angular.toJson(result));
						return $q.reject(result);
					}
				}).catch(function(err) {
					$log.error('ResourceService.removeFavorite(' + resourceId + ',' + graphName + ') failed: err=' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		util.onServerRemoved(function(server) {
			//$log.debug('ResourceService.onServerRemoved: cleaning up favorites for server ' + server.name);
			return favoritesDB.find({
				selector: {
					server: server._id,
					username: server.username
				}
			}).then(function(result) {
				if (result && result.docs && result.docs.length > 0) {
					for (var i=0, len=result.docs.length; i < len; i++) {
						result.docs[i]._deleted = true;
					}
					return favoritesDB.bulkDocs(result.docs);
				} else {
					return undefined;
				}
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
			unfavorite: removeFavorite
		};
	});

}());
