(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Modals', [
		'ionic',
		'ngCordova',
		'opennms.services.Alarms',
		'opennms.services.Analytics',
		'opennms.services.Availability',
		'opennms.services.BuildConfig',
		'opennms.services.Errors',
		'opennms.services.Events',
		'opennms.services.Info',
		'opennms.services.Nodes',
		'opennms.services.Outages',
		'opennms.services.Settings',
		'opennms.services.Util',
	])
	.factory('Modals', function($q, $rootScope, $interval, $ionicModal, $ionicPopup, AlarmService, Analytics, AvailabilityService, Errors, EventService, Info, NodeService, OutageService, Settings, util) {
		console.log('Modals: initializing.');

		var $scope = $rootScope.$new();
		$scope.util = util;
		$scope.settings = Settings;

		Settings.username().then(function(username) {
			$scope.username = username;
		});
		util.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
			if (changedSettings.username) {
				$scope.username = changedSettings.username;
			}
		});

		$scope.alarmModal = $q.defer();
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
					Analytics.trackView('outages');
					modal.show();
				});
			};
			modal.scope.hide = function() {
				modal.hide();
			};
			util.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
				if (modal.isShown() && timer && changedSettings && changedSettings.refreshInterval) {
					stopRefresh();
					startRefresh();
				}
			});
			modal.scope.$on('modal.hidden', stopRefresh);
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
								'User "' + $scope.username + '" does not have permission to clear alarms.',
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
								'User "' + $scope.username + '" does not have permission to escalate alarms.',
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
								'User "' + $scope.username + '" does not have permission to acknowledge alarms.',
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
								'User "' + $scope.username + '" does not have permission to unacknowledge alarms.',
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
				Analytics.trackView('alarm-detail');
				modal.show();
			};
			modal.scope.hide = function() {
				modal.hide();
			};
			util.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
				if (modal.isShown() && timer && changedSettings && changedSettings.refreshInterval) {
					stopRefresh();
					startRefresh();
				}
			});
			modal.scope.$on('modal.hidden', stopRefresh);
		});

		$ionicModal.fromTemplateUrl('templates/settings.html', {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.settingsModal.resolve(modal);
			modal.scope.show = function() {
				Analytics.trackView('settings');
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
