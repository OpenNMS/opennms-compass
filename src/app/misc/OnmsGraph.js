'use strict';

var angular = require('angular'),
	Backshift = require('backshift/dist/backshift.onms'),
	moment = require('moment'),
	RestError = require('../misc/RestError');

require('angular-debounce');

require('./HTTP');
require('./Queue');
require('./Rest');

require('../servers/Servers');

var HEADER_PADDING = 140;
var REFRESH_DELAY = 100;

var onmsGraphTemplate = require('ngtemplate!./onms-graph.html');

angular.module('opennms.misc.OnmsGraph', [
	'ionic',
	'rt.debounce',
	'opennms.misc.Queue',
	'opennms.services.Rest',
	'opennms.services.Servers',
	'opennms.util.HTTP'
])
.directive('onmsGraph', function($injector, $log, $q, $rootScope, $timeout, $window, debounce, HTTP, Queue, RestService, Servers) {
	var invalidCharacters = /[^a-zA-Z0-9]+/g;

	var graphQueue = Queue.create({
		name: 'OnmsGraph',
		maxRequests: 2
	});

	var getWidth = function() {
		return $window.innerWidth;
	};
	var getHeight = function getHeight() {
		if ($window.orientation % 180 === 0) { // eslint-disable-line no-magic-numbers
			return $window.innerWidth;
		}

		return $window.innerHeight - HEADER_PADDING;
	};

	var queue = function queue(cb, description) {
		$log.debug('queue: queueing ' + description);
		return graphQueue.add(cb, description);
	};

	return {
		scope: {
			resourceId: '=',
			graphDef: '=',
			range: '=',
			shouldDisplay: '=display',
			shouldRender: '=render',
			shouldShowDates: '=showDates'
		},
		replace: true,
		templateUrl: onmsGraphTemplate,
		link: function linkOnmsGraph($scope, element, attrs) {
			$scope.dirty = false;

			$scope.width = getWidth();
			$scope.height = getWidth();
			$scope.last = {};

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

			var getGraphId = function() {
				if ($scope.graphModel && $scope.graphModel.title) {
					return ($scope.resourceId + '|' + $scope.graphModel.title).replace(invalidCharacters, '.');
				}

				return null;
			};

			var getGraphDescription = function() {
				return $scope.resourceId + ' / ' + ($scope.graphModel && $scope.graphModel.title? $scope.graphModel.title : 'N/A');
			};

			var cleanUpGraph = function() {
				var resourceId = $scope.resourceId;
				$log.debug('Destroying graph: ' + getGraphDescription());
				graphQueue.cancel(getGraphDescription());

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
				return queue($scope.renderGraph, getGraphDescription());
			};

			$scope.renderGraph = function() {
				$log.debug('OnmsGraph.renderGraph(): called.');

				if (!$scope.ds)                { return $q.when(); }
				if (!$scope.graphModel)        { return $q.when(); }
				if (!$scope.graphModel.series) { return $q.when(); }
				if (!$scope.graphModel.title)  { return $q.when(); }
				if (!$scope.range)             { return $q.when(); }
				if (!$scope.range.start)       { return $q.when(); }
				if (!$scope.range.end)         { return $q.when(); }

				$log.debug('OnmsGraph.renderGraph(): rendering.');

				var description = getGraphDescription();

				var onmsGraphElement = angular.element(element).find('.graph').first();
				onmsGraphElement.width($scope.width);
				onmsGraphElement.height($scope.width);

				if ($scope.dirty) {
					$log.debug('OnmsGraph.renderGraph(): graph dependencies have changed, re-rendering.');
					if ($scope.graph) {
						$scope.graph.destroy();
					}
					$scope.graph = undefined;
					$scope.dirty = false;
				}

				var deferred = $q.defer();

				if ($scope.graph) {
					$log.debug('Graph exists: ' + description);
					$scope.graph.onAfterQuery = function() {
						$rootScope.$evalAsync(function() {
							deferred.resolve(true);
						});
					}
				} else {
					$log.debug('Rendering graph: ' + description);

					$scope.graph = new Backshift.Graph.Flot({
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

					$scope.graph.onAfterQuery = function() {
						$rootScope.$evalAsync(function() {
							deferred.resolve(true);
						});
					}
					$scope.graph.render();
					$scope.graph._last = {};
				}

				var newStart = $scope.range.start.getTime();
				var newEnd   = $scope.range.end.getTime();

				if (angular.equals($scope.graph._last.start,         newStart) &&
					angular.equals($scope.graph._last.end,           newEnd) &&
					angular.equals($scope.graph._last.shouldDisplay, $scope.shouldDisplay) &&
					angular.equals($scope.graph._last.shouldRender,  $scope.shouldRender) &&
					angular.equals($scope.graph._last.size,          $scope.width) &&
					angular.equals($scope.graph._last.ds,            $scope.ds) &&
					angular.equals($scope.graph._last.graphModel,    $scope.graphModel)
				) {
					// graph is unchanged
					deferred.resolve(true);
					$scope.$broadcast('scroll.refreshComplete');
					return deferred.promise;
				}

				// cancel any in-flight renderings since we're doing one fresh
				graphQueue.cancel(description);

				// make sure the graph date range is set
				$scope.graph.start = newStart;
				$scope.graph.end = newEnd;

				if ($scope.shouldDisplay && $scope.shouldRender) {
					$log.debug('OnmsGraph.renderGraph(): graph.begin(): ' + description);
					$scope.graph.begin();
				} else {
					$log.debug('OnmsGraph.renderGraph(): graph.onQuerySuccess(): ' + description);
					$scope.graph.cancel();
					//$scope.graph.onQuerySuccess();
					deferred.resolve(true);
				}

				return deferred.promise.then(function() {
					$scope.graph._last = {
						start: newStart,
						end: newEnd,
						shouldDisplay: $scope.shouldDisplay,
						shouldRender: $scope.shouldRender,
						size: $scope.width,
						ds: $scope.ds,
						graphModel: $scope.graphModel
					};
					$rootScope.$broadcast('opennms.graph.rendered', {
						resourceId: $scope.resourceId,
						graph: $scope.graphDef
					});
					$scope.$broadcast('scroll.refreshComplete');
					return true;
				}).catch(function(err) {
					return $q.reject(err);
				});
			};

			$scope.refresh = function() {
				//$log.debug('OnmsGraph.refresh()');
				return $scope.createGraph();
			};

			$scope.redraw = debounce(REFRESH_DELAY, $scope.refresh);

			/* eslint-disable no-magic-numbers */
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
			/* eslint-enable no-magic-numbers */

			var setDirtyAndRedraw = function(updated, previous, type) {
				if (angular.isArray(updated)) {
					for (var i=0, len=updated.length; i < len; i++) {
						if (previous[i] && !angular.equals(previous[i], updated[i])) {
							//$log.debug('OnmsGraph: dirty' + (type? ': ' + type : ''));
							$scope.dirty = true;
							$scope.redraw();
							return;
						}
					}
				} else {
					if (previous && !angular.equals(previous, updated)) {
						//$log.debug('OnmsGraph: dirty' + (type? ': ' + type : ''));
						$scope.dirty = true;
						$scope.redraw();
					}
				}
			};

			$scope.$watchGroup(['width', 'height'], function(newValue, oldValue) {
				setDirtyAndRedraw(newValue, oldValue, 'width/height');
			});
			$scope.$watchGroup(['shouldDisplay', 'shouldRender', 'shouldShowDates'], function(newValue, oldValue) {
				//setDirtyAndRedraw(newValue, oldValue, 'display/render/showDates');
				$scope.redraw();
			});

			$scope.$on('resize', function(ev, info) {
				//$log.debug('OnmsGraph: dirty: resize');
				$scope.width = info.width;
				$scope.height = info.height;
			});

			$scope.$watchGroup(['graphDef', 'resourceId'], function(watched) {
				if (watched[0] && watched[1]) {
					//$log.debug('OnmsGraph: dirty: graphDef/resourceId');
					$scope.rrdGraphConverter = new Backshift.Utilities.RrdGraphConverter({
						graphDef: watched[0],
						resourceId: watched[1]
					});
				}
			});

			$scope.$watch('rrdGraphConverter', function(rrdGraphConverter) {
				if (rrdGraphConverter && rrdGraphConverter.model) {
					//$log.debug('OnmsGraph: dirty: rrdGraphConverter');
					$scope.graphModel = rrdGraphConverter.model;
				}
			});

			$scope.$watch('graphModel', function(graphModel) {
				if (graphModel && graphModel.metrics) {
					//$log.debug('OnmsGraph: dirty: graphModel');
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
						} else {
							$log.warn('OnmsGraph: graphModel has changed, but server is unknown!');
						}
					});
				}
			});

			$scope.$on('opennms.refreshGraphs', $scope.redraw);
			$scope.$watch('ds', function(newDs, oldDs) {
				setDirtyAndRedraw(newDs, oldDs, 'ds');
			});

			$scope.$on('$destroy', cleanUp);
		}
	};
});
