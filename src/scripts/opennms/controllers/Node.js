(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.controllers.Node', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Analytics',
		'opennms.services.Availability',
		'opennms.services.Capabilities',
		'opennms.services.Errors',
		'opennms.services.Events',
		'opennms.services.Nodes',
		'opennms.services.Outages',
		'opennms.services.Resources',
		'opennms.services.Util',
	])
	.controller('NodeCtrl', function($q, $scope, $timeout, $window, $cordovaGeolocation, $ionicLoading, $ionicPopup, storage, util, Analytics, AvailabilityService, Capabilities, Errors, EventService, NodeService, OutageService, ResourceService) {
		console.log('NodeCtrl: initializing.');

		$scope.availabilityColor = function(value) {
			if (value >= 99.99) {
				return 'severity severity-NORMAL';
			} else if (value >= 97) {
				return 'severity severity-WARNING';
			} else if (value >= 0) {
				return 'severity severity-CRITICAL';
			}
			return 'severity severity-INDETERMINATE';
		};

		var timer;

		var resetModel = function() {
			$scope.node = {};
			$scope.canUpdateGeolocation = false;
			$scope.hasAddress = false;
			$scope.availability = undefined;
			$scope.outages = undefined;
			$scope.events = undefined;
			$scope.alarms = undefined;
			$scope.ipInterfaces = undefined;
			$scope.snmpInterfaces = undefined;
		};

		var showLoading = function() {
			/*
			$ionicLoading.show({
				templateUrl: 'templates/loading.html',
				hideOnStateChange: true,
			});
*/
		};

		var hideLoading = function() {
			$ionicLoading.hide();
		};

		var showNode = function(node) {
			//console.log('NodeCtrl.showNode: ' + angular.toJson(node));
			$scope.node = node;
			$scope.updateData();
		};

		$scope.updateData = function() {
			if (!$scope.node) {
				return;
			}

			console.log('NodeCtrl.updateData: getting updated data for node: ' + $scope.node.id);

			$scope.address = $scope.node.getAddress();
			if ($scope.address && ($scope.address.city || $scope.address.state || $scope.address.zip)) {
				$scope.hasAddress = true;
			}

			$scope.canUpdateGeolocation = Capabilities.setLocation();

			var avail = AvailabilityService.node($scope.node.id).then(function(results) {
				//console.log('AvailabilityService got results:',results);
				$scope.availability = results;
				return results;
			}, function(err) {
				console.log('AvailabilityService got error:',err);
				return err;
			});
			var ev = EventService.node($scope.node.id, 5).then(function(results) {
				//console.log('EventService got results:', results);
				$scope.events = results;
				return results;
			}, function(err) {
				console.log('EventService got error:',err);
				return err;
			});
			var outage = OutageService.node($scope.node.id).then(function(results) {
				//console.log('OutageService got results:', results);
				$scope.outages = results;
				return results;
			}, function(err) {
				console.log('OutageService got error:',err);
				return err;
			});
			$q.all(avail, ev, outage)['finally'](function() {
				$scope.$broadcast('scroll.refreshComplete');
			});
		};

		$scope.hasSnmpAttributes = function() {
			return ($scope.node && ($scope.node.sysContact ||
				$scope.node.sysDescription ||
				$scope.node.sysLocation ||
				$scope.node.sysName ||
				$scope.node.sysObjectId));
		};

		$scope.submitCoordinates = function() {
			$cordovaGeolocation.getCurrentPosition({
				timeout: 5000,
				enableHighAccuracy: true
			}).then(function(position) {
				var longitude = position.coords.longitude.toFixed(6);
				var latitude = position.coords.latitude.toFixed(6);
				$ionicPopup.confirm({
					'title': 'Update Coordinates?',
					'template': 'Update <strong>' + $scope.node.label + '</strong> to latitude ' + latitude + ' and longitude ' + longitude + '?',
					'cancelType': 'button-default',
					'okType': 'button-compass'
				}).then(function(confirmed) {
					if (confirmed) {
						console.log('NodeCtrl.submitCoordinates: posting latitude=' + latitude + ', longitude=' + longitude);
						NodeService.setLocation($scope.node, longitude, latitude).then(function() {
							console.log('Submitted coordinates.  Refreshing.');
							$scope.refreshNode();
						});
					} else {
						console.log('NodeCtrl.submitCoordinates: user canceled.');
					}
				});
			}, function(err) {
				console.log('failure:',err);
			});
		};

		$scope.refreshNode = function() {
			if ($scope.node.id) {
				showLoading();
				NodeService.get($scope.node.id).then(function(n) {
					showNode(n);
				}, function(err) {
					err.caller = 'NodeCtrl.refreshNode';
					console.log(err.toString());
				}).finally(function() {
					hideLoading();
				});
			}
		};

		$scope.showGraphButton = Capabilities.graphs();
		$scope.graphs = function() {
			ResourceService.resources($scope.node.id).then(function(res) {
				console.log('graphs: got res ' + angular.toJson(res));
			});
		};

		util.onDirty('alarms', function() {
			if ($scope.node && $scope.node.id) {
				$scope.refreshNode();
			}
		});
		util.onInfoUpdated(function(info) {
			$scope.showGraphButton = Capabilities.graphs();
			console.log('$scope.showGraphButton = ' + $scope.showGraphButton);
		});
		util.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
			if (timer && changedSettings && changedSettings.refreshInterval) {
				$scope.updateData();
			}
		});

		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			console.log('NodeCtrl: entering node view.');
			if (info && info.stateParams && info.stateParams.node) {
				var nodeId = parseInt(info.stateParams.node, 10);
				$scope.node = { id: nodeId };
			} else {
				console.log('NodeCtrl: unable to determine node from view.');
			}
			$scope.refreshNode();
		});

		$scope.$on('$ionicView.beforeLeave', function(ev, info) {
			if (info.direction === 'forward') {
				// we're going to the resources, keep the model in memory
			} else {
				console.log('NodeCtrl: leaving node view; cleaning up.');
				resetModel();
			}
		});
	});

}());