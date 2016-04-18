'use strict';

var angular = require('angular'),
	Backshift = require('backshift/dist/backshift.onms'),
	moment = require('moment'),
	RestError = require('../misc/RestError');

require('../servers/Servers');

require('../misc/HTTP');
require('../misc/Rest');

var onmsGraphTemplate = require('ngtemplate!./onms-graph.html');

angular.module('opennms.misc.OnmsGraph', [
	'ionic',
	'opennms.services.Rest',
	'opennms.services.Servers',
	'opennms.util.HTTP'
])
.directive('onmsGraph', function($log, $timeout, $window, $injector, HTTP, RestService, Servers) {
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

			/* eslint-disable no-empty */
			var deleteProperties = function(obj) {
				for (var prop in obj) {
					if (obj.hasOwnProperty(prop)) {
						try {
							delete obj[prop];
						} catch(err) {}
					}
				}
			};
			/* eslint-enable no-empty */

			var cleanUpGraph = function() {
				var resourceId = $scope.resourceId;
				var graphTitle = $scope.graphModel && $scope.graphModel.title? $scope.graphModel.title : 'N/A';
				$log.debug('Destroying graph: ' + resourceId + ' / ' + graphTitle);
				if ($scope.graph) {
					if ($scope.graph.destroy) {
						$scope.graph.destroy();
					}
					if ($scope.graph._last) {
						deleteProperties($scope.graph._last);
					}
					deleteProperties($scope.graph);
					$scope.graph = undefined;
				}
			};

			/* eslint-disable no-empty */
			var cleanUp = function() {
				cleanUpGraph();
				try {
					delete $scope.ds;
					delete $scope.graphModel;
					delete $scope.range;
				} catch(err) {}
			};
			/* eslint-enable no-empty */

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

				cleanUpGraph();
				if ($scope.graph && $scope.graph.destroy) {
					var oldGraph = $scope.graph;
					oldGraph.destroy();
					delete oldGraph.element;
					delete oldGraph._last.graphModel;
					delete oldGraph._last.ds;
					delete oldGraph._last.range;
					delete oldGraph._last.width;
					delete oldGraph._last.height;
					delete oldGraph._last;
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

							options.fetchFunction = function(url, data, success, failure) {
								HTTP.post(url, {
									data: data,
									headers: {
										'Content-Type': 'application/json',
										Accept: 'application/json'
									}
								}).then(function(response) {
									//$log.debug('ResourceService.fetchFunction: ' + angular.toJson(response));
									if (angular.isString(response.data)) {
										try {
											var json = angular.fromJson(response.data);
											//$log.debug('ResourceService.fetchFunction: json = ' + angular.toJson(json));
											success(json);
										} catch (err) {
											if (err.message) {
												$log.error('ResourceService.fetchFunction: error: ' + err.message);
											} else {
												$log.error('ResourceService.fetchFunction: error: ' + err);
											}
											$log.debug('ResourceService.fetchFunction: falling back to sending the raw response data string.');
											success(response.data);
										}
									} else {
										success(response.data);
									}
								}, function(err) {
									var error = new RestError(url, err.data, err.status);
									$log.error('ResourceService.fetchFunction: cordovaHTTP error: ' + error.toString());
									failure(error.toString());
								});
							};

							$scope.ds = new Backshift.DataSource.OpenNMS(options);
						}
					});
				}
			});

			$scope.$watch('ds', function() {
				$scope.redraw();
			});

			$scope.$on('$destroy', cleanUp);
			//element.on('$destroy', cleanUp);
		}
	};
});