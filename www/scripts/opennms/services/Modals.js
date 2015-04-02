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
	.factory('Modals', ['$q', '$rootScope', '$interval', '$ionicModal', '$ionicPopup', 'AlarmService', 'AvailabilityService', 'Errors', 'EventService', 'Info', 'NodeService', 'OutageService', 'Settings', 'util', function($q, $rootScope, $interval, $ionicModal, $ionicPopup, AlarmService, AvailabilityService, Errors, EventService, Info, NodeService, OutageService, Settings, util) {
		console.log('Views: initializing.');

		var $scope = $rootScope.$new();
		$scope.util = util;
		$scope.settings = Settings;

		$scope.alarmModal = $q.defer();
		$scope.infoModal = $q.defer();
		$scope.nodeModal = $q.defer();
		$scope.outageModal = $q.defer();
		$scope.settingsModal = $q.defer();

		$ionicModal.fromTemplateUrl('templates/node-detail.html', {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.nodeModal.resolve(modal);

			var timer;

			modal.scope.availabilityColor = function(value) {
				if (value >= 99.99) {
					return 'severity severity-NORMAL';
				} else if (value >= 97) {
					return 'severity severity-WARNING';
				} else if (value >= 0) {
					return 'severity severity-CRITICAL';
				}
				return 'severity severity-INDETERMINATE';
			};

			modal.scope.updateData = function() {
				console.log('Modals.node-detail: getting updated data for node ' + modal.scope.node.id);
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

			var startRefresh = function() {
				//timer = $interval(modal.scope.updateData, Settings.refreshInterval());
				modal.scope.updateData();
			};

			var stopRefresh = function() {
				if (timer) {
					$interval.cancel(timer);
				}
			};

			modal.scope.show = function(node) {
				// first, clear everything out
				modal.scope.node = {};
				modal.scope.availability = undefined;
				modal.scope.outages = undefined;
				modal.scope.events = undefined;
				modal.scope.alarms = undefined;
				modal.scope.ipInterfaces = undefined;
				modal.scope.snmpInterfaces = undefined;

				var showNode = function(node) {
					modal.scope.node = node;
					startRefresh();
					modal.show();
				};

				if (angular.isNumber(node)) {
					// we were passed a node ID, look it up first
					NodeService.get(node).then(function(n) {
						showNode(n);
					}, function(err) {
						err.caller = 'EventService.getEventsForNode';
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
			};
			modal.scope.$on('opennms.settings.changed', function(ev, newSettings, oldSettings, changedSettings) {
				if (timer && changedSettings && changedSettings.refreshInterval) {
					stopRefresh();
					startRefresh();
				}
			});
			modal.scope.$on('modal.hidden', function() {
				stopRefresh();
			});
		});

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
				$scope.nodeModal.promise.then(function(modal) {
					modal.scope.show(id);
				});
			};

			modal.scope.refreshOutages = function() {
				OutageService.summaries().then(function(outages) {
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
					modal.scope.$broadcast('scroll.refreshComplete');
				});
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
				startRefresh();
				modal.show();
			};
			modal.scope.hide = function() {
				modal.hide();
			};
			modal.scope.$on('opennms.settings.changed', function(ev, newSettings, oldSettings, changedSettings) {
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
					if (err.status === 403) {
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
					if (err.status === 403) {
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
					if (err.status === 403) {
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
					if (err.status === 403) {
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
			modal.scope.$on('opennms.settings.changed', function(ev, newSettings, oldSettings, changedSettings) {
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
				Info.get().then(function(info) {
					modal.scope.info = info;
				});
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
			$scope.nodeModal.promise.then(function(modal) {
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
				$scope.nodeModal.promise.then(function(modal) {
					modal.scope.show(node);
				});
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
	}]);

}());
