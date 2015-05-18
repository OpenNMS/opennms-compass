(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Modals', [
		'ionic',
		'opennms.services.Alarms',
		'opennms.services.Availability',
		'opennms.services.BuildConfig',
		'opennms.services.Config',
		'opennms.services.Errors',
		'opennms.services.Events',
		'opennms.services.Info',
		'opennms.services.Nodes',
		'opennms.services.Outages',
		'opennms.services.Util',
	])
	.factory('NodeModal', function($q, $rootScope, $interval, $ionicModal, $ionicPopup, $cordovaGeolocation, AvailabilityService, EventService, Info, NodeService, OutageService) {
		console.log('NodeModal: initializing.');
		var $scope = $rootScope.$new();
		var nodeModal = $q.defer();

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

		$ionicModal.fromTemplateUrl('templates/node-detail.html', {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			nodeModal.resolve(modal);

			var timer;

			var resetModel = function() {
				modal.scope.node = {};
				modal.scope.canUpdateGeolocation = false;
				modal.scope.hasAddress = false;
				modal.scope.availability = undefined;
				modal.scope.outages = undefined;
				modal.scope.events = undefined;
				modal.scope.alarms = undefined;
				modal.scope.ipInterfaces = undefined;
				modal.scope.snmpInterfaces = undefined;
			};

			var showNode = function(node) {
				modal.scope.node = node;
				modal.scope.updateData();
				modal.show();
			};

			modal.scope.updateData = function() {
				console.log('NodeModal.updateData: getting updated data for node ' + modal.scope.node.id);

				modal.scope.address = modal.scope.node.getAddress();
				if (modal.scope.address && (modal.scope.address.city || modal.scope.address.state || modal.scope.address.zip)) {
					modal.scope.hasAddress = true;
				}

				modal.scope.canUpdateGeolocation = Info.canSetLocation();

				var avail = AvailabilityService.node(modal.scope.node.id).then(function(results) {
					//console.log('AvailabilityService got results:',results);
					modal.scope.availability = results;
					return results;
				}, function(err) {
					console.log('AvailabilityService got error:',err);
					return err;
				});
				var ev = EventService.node(modal.scope.node.id, 5).then(function(results) {
					//console.log('EventService got results:', results);
					modal.scope.events = results;
					return results;
				}, function(err) {
					console.log('EventService got error:',err);
					return err;
				});
				var outage = OutageService.node(modal.scope.node.id).then(function(results) {
					//console.log('OutageService got results:', results);
					modal.scope.outages = results;
					return results;
				}, function(err) {
					console.log('OutageService got error:',err);
					return err;
				});
				$q.all(avail, ev, outage)['finally'](function() {
					modal.scope.$broadcast('scroll.refreshComplete');
				});
			};

			modal.scope.hasSnmpAttributes = function() {
				return (modal.scope.node && (modal.scope.node.sysContact ||
					modal.scope.node.sysDescription ||
					modal.scope.node.sysLocation ||
					modal.scope.node.sysName ||
					modal.scope.node.sysObjectId));
			};

			modal.scope.submitCoordinates = function() {
				$cordovaGeolocation.getCurrentPosition({
					timeout: 5000,
					enableHighAccuracy: true
				}).then(function(position) {
					var longitude = position.coords.longitude.toFixed(6);
					var latitude = position.coords.latitude.toFixed(6);
					$ionicPopup.confirm({
						'title': 'Update Coordinates?',
						'template': 'Update <strong>' + modal.scope.node.label + '</strong> to latitude ' + latitude + ' and longitude ' + longitude + '?',
						'cancelType': 'button-default',
						'okType': 'button-compass'
					}).then(function(confirmed) {
						if (confirmed) {
							console.log('NodeModal.submitCoordinates: posting latitude=' + latitude + ', longitude=' + longitude);
							NodeService.setLocation(modal.scope.node, longitude, latitude).then(function() {
								console.log('Submitted coordinates.  Refreshing.');
								modal.scope.refreshNode();
							});
						} else {
							console.log('NodeModal.submitCoordinates: user canceled.');
						}
					});
				}, function(err) {
					console.log('failure:',err);
				});
			};

			modal.scope.refreshNode = function() {
				if (modal.scope.node.id) {
					NodeService.get(modal.scope.node.id).then(function(n) {
						showNode(n);
					}, function(err) {
						err.caller = 'NodeModal.refreshNode';
						console.log(err.toString());
					});
				}
			};

			modal.scope.show = function(node) {
				// first, clear everything out
				resetModel();

				if (angular.isNumber(node)) {
					// we were passed a node ID, look it up first
					NodeService.get(node).then(function(n) {
						showNode(n);
					}, function(err) {
						err.caller = 'NodeModal.show';
						console.log(err.toString());
					});
				} else {
					showNode(node);
				}
			};
			modal.scope.hide = function() {
				if (modal.scope.node && modal.scope.node.id) {
					console.log('Hiding node: ' + modal.scope.node.id);
				}
				modal.hide();
				resetModel();
			};
			modal.scope.$on('opennms.dirty', function(ev, type) {
				if (!modal.scope.node) {
					// not yet initialized, ignore it
					return;
				}
				switch(type) {
					case 'alarms':
						modal.scope.refreshNode();
						break;
				}
			});
			modal.scope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
				if (timer && changedSettings && changedSettings.refreshInterval) {
					modal.scope.updateData();
				}
			});
		});

		$scope.$on('$destroy', function() {
			nodeModal.promise.then(function(modal) {
				modal.scope.hide();
				modal.remove();
			});
		});

		return {
			show: function(node) {
				nodeModal.promise.then(function(modal) {
					modal.scope.show(node);
				});
			},
		};
	})
	.factory('Modals', function($q, $rootScope, $interval, $ionicModal, $ionicPopup, AlarmService, AvailabilityService, Errors, EventService, Info, NodeService, OutageService, Settings, util, NodeModal) {
		console.log('Modals: initializing.');

		var $scope = $rootScope.$new();
		$scope.util = util;
		$scope.settings = Settings;

		$scope.alarmModal = $q.defer();
		$scope.infoModal = $q.defer();
		$scope.outageModal = $q.defer();
		$scope.settingsModal = $q.defer();

		$ionicModal.fromTemplateUrl('templates/outages.html', {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.outageModal.resolve(modal);

			var timer;

			var getOutages = function(outage) {
				OutageService.node(outage.nodeId).then(function(nodeOutages) {
					//console.log('Node Outages:',nodeOutages);
					nodeOutages.sort(function(a, b) {
						var comp = a.ipAddress.localeCompare(b.ipAddress);
						if (comp === 0) {
							return a.monitoredService.serviceName.localeCompare(b.monitoredService.serviceName);
						} else {
							return comp;
						}
					});
					outage.nodeOutages = nodeOutages;
					return nodeOutages;
				}, function(err) {
					outage.nodeOutages = [];
					return err;
				});
			};

			var byId = function(outages) {
				var ret = {};
				for (var i=0; i < outages.length; i++) {
					ret[outages[i].nodeId] = outages[i];
				}
				return ret;
			};

			modal.scope.showNode = function(id) {
				NodeModal.show(id);
			};

			modal.scope.refreshOutages = function() {
				var promise = OutageService.summaries();
				promise.then(function(outages) {
					var oldOutages = byId(modal.scope.outages);
					var oldOutage;
					for (var i=0; i < outages.length; i++) {
						oldOutage = oldOutages[outages[i].nodeId];
						if (oldOutage && oldOutage.nodeOutages) {
							outages[i].nodeOutages = oldOutage.nodeOutages;
						}
						getOutages(outages[i]);
					}
					modal.scope.outages = outages;
					delete modal.scope.error;
					modal.scope.$broadcast('scroll.refreshComplete');
				}, function(err) {
					modal.scope.error = err;
					modal.scope.outages = [];
					modal.scope.$broadcast('scroll.refreshComplete');
				});
				return promise;
			};

			var startRefresh = function() {
				//timer = $interval(modal.scope.refreshOutages, Settings.refreshInterval());
				modal.scope.refreshOutages();
			};

			var stopRefresh = function() {
				if (timer) {
					$interval.cancel(timer);
				}
			};

			modal.scope.show = function() {
				modal.scope.outages = [];
				modal.scope.refreshOutages().then(function() {
					modal.show();
				});
			};
			modal.scope.hide = function() {
				modal.hide();
			};
			modal.scope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
				if (timer && changedSettings && changedSettings.refreshInterval) {
					stopRefresh();
					startRefresh();
				}
			});
			modal.scope.$on('modal.hidden', function() {
				stopRefresh();
			});
		});

		$ionicModal.fromTemplateUrl('templates/alarm-detail.html', {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.alarmModal.resolve(modal);

			var timer;
			modal.scope.updateAlarmData = function() {
				if (modal.scope.alarm && modal.scope.alarm.id) {
					var promise = AlarmService.alarm(modal.scope.alarm.id);
					promise['finally'](function() {
						modal.scope.$broadcast('scroll.refreshComplete');
					});
					promise.then(function(alarm) {
						modal.scope.alarm = alarm;
					});
				} else {
					console.log('Modals.updateAlarmData: no alarm associated with alarm modal!');
					modal.scope.$broadcast('scroll.refreshComplete');
				}
			};
			modal.scope.clear = function() {
				AlarmService.clear(modal.scope.alarm).then(modal.scope.updateAlarmData, function(err) {
					console.log('err=',err);
					if (err.permissionDenied()) {
						$ionicPopup.alert({
							title: 'Permission Denied',
							template: '<p>Unable to clear alarm.</p>\n' +
								'User "' + Settings.username() + '" does not have permission to clear alarms.',
							okType: 'button-assertive'
						});
					}
					modal.scope.updateAlarmData();
				});
			};
			modal.scope.escalate = function() {
				AlarmService.escalate(modal.scope.alarm).then(modal.scope.updateAlarmData, function(err) {
					console.log('err=',err);
					if (err.permissionDenied()) {
						$ionicPopup.alert({
							title: 'Permission Denied',
							template: '<p>Unable to escalate alarm.</p>\n' +
								'User "' + Settings.username() + '" does not have permission to escalate alarms.',
							okType: 'button-assertive'
						});
					}
					modal.scope.updateAlarmData();
				});
			};
			modal.scope.acknowledge = function() {
				AlarmService.acknowledge(modal.scope.alarm).then(modal.scope.updateAlarmData, function(err) {
					if (err.permissionDenied()) {
						$ionicPopup.alert({
							title: 'Permission Denied',
							template: '<p>Unable to acknowledge alarm.</p>\n' +
								'User "' + Settings.username() + '" does not have permission to acknowledge alarms.',
							okType: 'button-assertive'
						});
					}
					modal.scope.updateAlarmData();
				});
			};
			modal.scope.unacknowledge = function() {
				AlarmService.unacknowledge(modal.scope.alarm).then(modal.scope.updateAlarmData, function(err) {
					if (err.permissionDenied()) {
						$ionicPopup.alert({
							title: 'Permission Denied',
							template: '<p>Unable to unacknowledge alarm.</p>\n' +
								'User "' + Settings.username() + '" does not have permission to unacknowledge alarms.',
							okType: 'button-assertive'
						});
					}
					modal.scope.updateAlarmData();
				});
			};

			var startRefresh = function() {
				//timer = $interval(modal.scope.updateAlarmData, Settings.refreshInterval());
				modal.scope.updateAlarmData();
			};

			var stopRefresh = function() {
				if (timer) {
					$interval.cancel(timer);
				}
			};

			modal.scope.show = function(alarm) {
				modal.scope.alarm = alarm;
				startRefresh();
				modal.show();
			};
			modal.scope.hide = function() {
				modal.hide();
			};
			modal.scope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
				if (timer && changedSettings && changedSettings.refreshInterval) {
					stopRefresh();
					startRefresh();
				}
			});
			modal.scope.$on('modal.hidden', function() {
				stopRefresh();
			});
		});

		$ionicModal.fromTemplateUrl('templates/settings.html', {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.settingsModal.resolve(modal);
			modal.scope.show = function() {
				modal.show();
			};
			modal.scope.hide = function() {
				modal.hide();
			};
		});
		$ionicModal.fromTemplateUrl('templates/info.html', {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.infoModal.resolve(modal);

			modal.scope.formatType = function(type) {
				if (type) {
					var chunks = type.split('-');
					var ret = "";
					for (var i=0; i < chunks.length; i++) {
						ret += chunks[i].capitalize();
						if ((i+1) !== chunks.length) {
							ret += " ";
						}
					}
					return ret;
				}
				return type;
			};
			modal.scope.getErrorMessage = function(error) {
				if (error.message && error.message.toString) {
					return error.message.toString();
				} else {
					return error.message;
				}
			};

			modal.scope.clear = function() {
				Errors.reset();
				modal.scope.errors = [];
			};
			modal.scope.show = function() {
				modal.scope.errors = Errors.get();
				modal.scope.info = Info.get();
				modal.scope.canSetLocation = Info.canSetLocation();
				AvailabilityService.supported().then(function(isSupported) {
					modal.scope.hasAvailability = isSupported;
				});

				modal.show();
			};
			modal.scope.hide = function() {
				modal.hide();
			};
		});

		$scope.$on('$destroy', function() {
			$scope.alarmModal.promise.then(function(modal) {
				modal.scope.hide();
				modal.remove();
			});
			$scope.infoModal.promise.then(function(modal) {
				modal.scope.hide();
				modal.remove();
			});
			$scope.outageModal.promise.then(function(modal) {
				modal.scope.hide();
				modal.remove();
			});
			$scope.settingsModal.promise.then(function(modal) {
				modal.scope.hide();
				modal.remove();
			});
		});

		$scope.modals = {
			alarm: function(alarm) {
				$scope.alarmModal.promise.then(function(modal) {
					modal.scope.show(alarm);
				});
			},
			info: function() {
				$scope.infoModal.promise.then(function(modal) {
					modal.scope.show();
				});
			},
			node: function(node) {
				NodeModal.show(node);
			},
			outages: function() {
				$scope.outageModal.promise.then(function(modal) {
					modal.scope.show();
				});
			},
			settings: function() {
				$scope.settingsModal.promise.then(function(modal) {
					modal.scope.show();
				});
			},
		};
		return $scope.modals;
	});

}());
