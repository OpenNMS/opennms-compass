(function() {
	'use strict';

	var angular = require('angular');
	require('ngCordova');
	require('angular-debounce');

	var Constants = require('../misc/Constants');
	var Node = require('./models/Node');
	var AvailabilityNode = require('../availability/models/AvailabilityNode');
	var OnmsEvent = require('../events/models/OnmsEvent');
	var Outage = require('../outages/models/Outage');

	var SEVERITY_THRESHOLD_NORMAL = 99.99,
		SEVERITY_THRESHOLD_WARNING = 97,
		SEVERITY_THRESHOLD_CRITICAL = 0;

	var NODE_EVENTS_LIMIT = 5;

	var GEOLOCATION_TIMEOUT = 5000,
		GEOLOCATION_SIGFIG = 6;

	var REFRESH_DEBOUNCE = 500;

	require('./NodeService');
	require('./ResourceService');

	require('../availability/Service');
	require('../events/EventService');
	require('../outages/OutageService');

	require('../misc/Cache');
	require('../misc/Capabilities');
	require('../misc/Errors');
	require('../misc/util');

	var loadingTemplate = require('ngtemplate!../misc/loading.html');
	var nodeDetailTemplate = require('ngtemplate!./node-detail.html');

	angular.module('opennms.controllers.Node', [
		'ionic',
		'ngCordova',
		'rt.debounce',
		'nemLogging',
		'ui-leaflet',
		'angularLocalStorage',
		'opennms.misc.Cache',
		'opennms.services.Availability',
		'opennms.services.Capabilities',
		'opennms.services.Errors',
		'opennms.services.Events',
		'opennms.services.Nodes',
		'opennms.services.Outages',
		'opennms.services.Resources',
		'opennms.services.Util'
	])
	.config(function($stateProvider) {
		$stateProvider
		.state('node-detail', {
			url: '/nodes/:node',
			templateUrl: nodeDetailTemplate,
			controller: 'NodeCtrl'
		});
	})
	.controller('NodeCtrl', function($cordovaGeolocation, $ionicLoading, $ionicPopup, $log, $q, $scope, $timeout, $window, AvailabilityService, Cache, Capabilities, debounce, Errors, EventService, NodeService, OutageService, ResourceService, storage, util) {
		$log.info('NodeCtrl: initializing.');

		$scope.loading = false;
		$scope.util = util;
		$scope.availabilityColor = function(value) {
			if (value >= SEVERITY_THRESHOLD_NORMAL) {
				return 'severity severity-NORMAL';
			} else if (value >= SEVERITY_THRESHOLD_WARNING) {
				return 'severity severity-WARNING';
			} else if (value >= SEVERITY_THRESHOLD_CRITICAL) {
				return 'severity severity-CRITICAL';
			}
			return 'severity severity-INDETERMINATE';
		};

		var leafletDefaults = {
			markers: {},
			center: {},
			defaults: {
				tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
			}
		};

		$scope.leaflet = angular.copy(leafletDefaults);

		var resetData = function() {
			$scope.loaded = false;
			$scope.node = {};
			$scope.canUpdateGeolocation = false;
			$scope.hasAddress = false;
			$scope.availability = undefined;
			$scope.outages = undefined;
			$scope.events = undefined;
			$scope.alarms = undefined;
			$scope.ipInterfaces = undefined;
			$scope.snmpInterfaces = undefined;
			$scope.leaflet = angular.copy(leafletDefaults);
		};

		var showLoading = function() {
			$scope.loading = true;
		};

		var hideLoading = function() {
			$scope.loading = false;
			$ionicLoading.hide();
		};

		var showNode = function(node) {
			//$log.debug('NodeCtrl.showNode: ' + angular.toJson(node));
			$scope.node = node;
			$scope.updateData();
		};

		$scope.updateData = function() {
			if (!$scope.node) {
				return;
			}

			$log.debug('NodeCtrl.updateData: getting updated data for node: ' + $scope.nodeId);

			$scope.address = $scope.node.getAddress();
			if ($scope.address && ($scope.address.city || $scope.address.state || $scope.address.zip)) {
				$scope.hasAddress = true;
			}
			if ($scope.address && ($scope.address.hasOwnProperty('latitude') && $scope.address.hasOwnProperty('longitude'))) {
				$scope.leaflet = angular.merge({}, leafletDefaults, {
					markers: {
						node: {
							lat: $scope.address.latitude,
							lng: $scope.address.longitude,
							focus: true,
							draggable: false
						}
					}, center: {
						lat: $scope.address.latitude,
						lng: $scope.address.longitude,
						zoom: 13
					}, defaults: {
						attributionControl: false,
						dragging: false,
						zoomControl: true,
						scrollWheelZoom: false,
						doubleClickZoom: false,
						touchZoom: false,
						tap: true
					}
				});
				//console.log('leaflet=' + angular.toJson($scope.leaflet));
			}

			$scope.canUpdateGeolocation = Capabilities.setLocation();

			Cache.get('node-' + $scope.nodeId + '-availability', AvailabilityNode).then(function(availability) {
				$scope.availability = availability;
			});
			var avail = AvailabilityService.node($scope.nodeId).then(function(results) {
				if (__DEVELOPMENT__) { $log.debug('AvailabilityService got results:'+angular.toJson(results)); }
				$scope.availability = results;
				Cache.set('node-' + $scope.nodeId + '-availability', results);
				return results;
			}, function(err) {
				$log.error('AvailabilityService got error:',err);
				return err;
			});

			Cache.get('node-' + $scope.nodeId + '-events', OnmsEvent).then(function(events) {
				$scope.events = events;
			});
			var ev = EventService.node($scope.nodeId, NODE_EVENTS_LIMIT).then(function(results) {
				//$log.debug('EventService got results:', results);
				$scope.events = results;
				Cache.set('node-' + $scope.nodeId + '-events', results);
				return results;
			}, function(err) {
				$log.error('EventService got error:',err);
				return err;
			});

			Cache.get('node-' + $scope.nodeId + '-outages', Outage).then(function(outages) {
				$scope.outages = outages;
			});
			var outage = OutageService.node($scope.nodeId).then(function(results) {
				//$log.debug('OutageService got results:', results);
				$scope.outages = results;
				Cache.set('node-' + $scope.nodeId + '-outages', results);
				return results;
			}, function(err) {
				$log.error('OutageService got error:',err);
				return err;
			});

			$q.all(avail, ev, outage).finally(function() {
				$scope.loaded = true;
				$scope.$broadcast('scroll.refreshComplete');
			});
		};

		$scope.hasSnmpAttributes = function() {
			return $scope.node && $scope.node.sysContact ||
				$scope.node.sysDescription ||
				$scope.node.sysLocation ||
				$scope.node.sysName ||
				$scope.node.sysObjectId;
		};

		$scope.submitCoordinates = function() {
			$cordovaGeolocation.getCurrentPosition({
				timeout: GEOLOCATION_TIMEOUT,
				enableHighAccuracy: true
			}).then(function(position) {
				var longitude = position.coords.longitude.toFixed(GEOLOCATION_SIGFIG);
				var latitude = position.coords.latitude.toFixed(GEOLOCATION_SIGFIG);
				$ionicPopup.confirm({
					title: 'Update Coordinates?',
					template: 'Update <strong>' + $scope.node.label + '</strong> to latitude ' + latitude + ' and longitude ' + longitude + '?',
					cancelType: 'button-default',
					okType: 'button-compass'
				}).then(function(confirmed) {
					if (confirmed) {
						$log.debug('NodeCtrl.submitCoordinates: posting latitude=' + latitude + ', longitude=' + longitude);
						NodeService.setLocation($scope.node, longitude, latitude).then(function() {
							$log.debug('NodeCtrl.submitCoordinates: Submitted coordinates.  Refreshing.');
							$scope.refresh();
						}, function(err) {
							$log.error('NodeCtrl.submitCoordinates: failed to submit coordinates: ' + angular.toJson(err));
						});
					} else {
						$log.debug('NodeCtrl.submitCoordinates: user canceled.');
					}
				});
			}, function(err) {
				$log.error('failure:',err);
			});
		};

		var refreshNode = function() {
			if ($scope.nodeId) {
				Cache.get('node-' + $scope.nodeId, Node).then(function(node) {
					showNode(node);
				}).catch(function(err) {
					showLoading();
				});
				return NodeService.get($scope.nodeId).then(function(n) {
					Cache.set('node-' + $scope.nodeId, n);
					return showNode(n);
				}, function(err) {
					err.caller = 'NodeCtrl.refresh';
					$log.error(err.toString());
					return $q.reject(err);
				}).finally(function() {
					hideLoading();
				});
			}

			return $q.when();
		};

		var checkResources = function() {
			var showGraphButton = Capabilities.graphs();
			if ($scope.nodeId && showGraphButton) {
				Cache.get('node-' + $scope.nodeId + '-show-graph-button').then(function(res) {
					$scope.showGraphButton = res;
				});
				return ResourceService.resources($scope.nodeId).then(function(res) {
					//$log.debug('graphs: got res ' + angular.toJson(res));
					$scope.showGraphButton = res && res.children && res.children.length > 0; // eslint-disable-line no-magic-numbers
					Cache.set('node-' + $scope.nodeId + '-show-graph-button', $scope.showGraphButton);
					return $scope.showGraphButton;
				}).catch(function(err) {
					$scope.showGraphButton = false;
					return $scope.showGraphButton;
				});
			}

			$scope.showGraphButton = false;
			return $q.when($scope.showGraphButton);
		};

		$scope.refresh = debounce(REFRESH_DEBOUNCE, function() {
			if ($scope.nodeId) {
				showLoading();
				$q.all({
					node: refreshNode(),
					resources: checkResources()
				}).finally(function() {
					hideLoading();
				});
			} else {
				$log.debug('NodeCtrl: no node ID');
			}
		});

		util.onInfoUpdated(function(info) {
			$scope.showGraphButton = Capabilities.graphs();
			$log.debug('$scope.showGraphButton = ' + $scope.showGraphButton);
			$scope.refresh();
		});

		var lastServer = {};
		util.onDefaultServerUpdated(function(defaultServer) {
			if (lastServer.name !== defaultServer.name) {
				resetData();
			}
			lastServer = defaultServer || {};
			$scope.refresh();
		});
		util.onLowMemory('node-detail', function(currentView) {
			$log.debug('NodeCtrl: resetting data because of low memory.');
			resetData();
		});

		var lazyReset;
		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			$timeout.cancel(lazyReset);
			if (info && info.stateParams && info.stateParams.node) {
				var nodeId = parseInt(info.stateParams.node, 10);
				$scope.nodeId = nodeId;
			} else {
				$log.error('NodeCtrl: unable to determine node from view.');
			}
			$scope.refresh();
		});
		$scope.$on('$ionicView.afterLeave', function() {
			if (Capabilities.lowMemory()) {
				resetData();
			} else {
				lazyReset = $timeout(resetData, Constants.DEFAULT_TIMEOUT);
			}
		});
	});

}());
