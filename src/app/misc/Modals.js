(function() {
	'use strict';

	var angular = require('angular'),
		Outage = require('../outages/models/Outage'),
		OutageSummary = require('../outages/models/OutageSummary');

	require('../../../generated/misc/BuildConfig');

	require('./Cache');
	require('./Errors');
	require('./Info');
	require('./util');

	require('../alarms/AlarmService');
	require('../events/EventService');
	require('../outages/OutageService');
	require('../servers/Servers');
	require('../settings/SettingsService');

	var alarmDetailTemplate = require('ngtemplate!../alarms/alarm-detail.html');
	var outagesTemplate = require('ngtemplate!../outages/outages.html');
	var settingsTemplate = require('ngtemplate!../settings/settings.html');

	angular.module('opennms.services.Modals', [
		'ionic',
		'ngCordova',
		'opennms.misc.Cache',
		'opennms.services.Alarms',
		'opennms.services.BuildConfig',
		'opennms.services.Errors',
		'opennms.services.Events',
		'opennms.services.Info',
		'opennms.services.Outages',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util'
	])
	.factory('Modals', function($q, $rootScope, $interval, $log, $ionicModal, $ionicPopup, AlarmService, Cache, Errors, EventService, Info, OutageService, Servers, Settings, util) {
		$log.info('Modals: initializing.');

		var $scope = $rootScope.$new();
		$scope.util = util;
		$scope.settings = Settings;

		Servers.getDefault().then(function(server) {
			if (server && server.username) {
				$scope.username = server.username;
			}
		});
		util.onDefaultServerUpdated(function(server) {
			if (server && server.username) {
				$scope.username = server.username;
			} else {
				$scope.username = undefined;
			}
		});

		$scope.alarmModal = $q.defer();
		$scope.outageModal = $q.defer();
		$scope.settingsModal = $q.defer();

		$ionicModal.fromTemplateUrl(outagesTemplate, {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			var timer;

			var getOutages = function(outage) {
				Cache.get('modal-outages-' + outage.nodeId, Outage).then(function(nodeOutages) {
					outage.nodeOutages = nodeOutages;
				});
				return OutageService.node(outage.nodeId).then(function(nodeOutages) {
					nodeOutages.sort(function(a, b) {
						var comp = a.ipAddress.localeCompare(b.ipAddress);
						if (comp === 0) { // eslint-disable-line no-magic-numbers
							return a.monitoredService.serviceName.localeCompare(b.monitoredService.serviceName);
						}

						return comp;
					});
					outage.nodeOutages = nodeOutages;
					Cache.set('modal-outages-' + outage.nodeId, nodeOutages);
					return nodeOutages;
				}).catch(function(err) {
					outage.nodeOutages = [];
					return $q.reject(err);
				}).finally(function() {
					modal.scope.$broadcast('scroll.refreshComplete');
				});
			};

			var byId = function(outages) {
				var ret = {};
				for (var i=0, len=outages.length; i < len; i++) {
					ret[outages[i].nodeId] = outages[i];
				}
				return ret;
			};

			modal.scope.refreshOutages = function() {
				$log.debug('Modals.outages.refreshOutages()');
				Cache.get('modal-outages', OutageSummary).then(function(summaries) {
					modal.scope.outages = summaries;
				});
				return OutageService.summaries().then(function(outages) {
					$log.debug('Got outages: ' + outages.length);
					var oldOutages = byId(modal.scope.outages);
					var oldOutage;
					for (var i=0, len=outages.length; i < len; i++) {
						oldOutage = oldOutages[outages[i].nodeId];
						if (oldOutage && oldOutage.nodeOutages) {
							outages[i].nodeOutages = oldOutage.nodeOutages;
						}
						getOutages(outages[i]);
					}
					modal.scope.outages = outages;
					Cache.set('modal-outages', outages);
					delete modal.scope.error;
					return outages;
				}).catch(function(err) {
					$log.error('Error refreshing outages: ' + angular.toJson(err));
					modal.scope.error = err;
					modal.scope.outages = [];
					return $q.reject(err);
				}).finally(function() {
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
				modal.scope.refreshOutages().then(function() {
					util.trackView('outages');
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
			$scope.outageModal.resolve(modal);
		});

		$ionicModal.fromTemplateUrl(alarmDetailTemplate, {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			var timer;
			modal.scope.updateAlarmData = function() {
				if (modal.scope.alarm && modal.scope.alarm.id) {
					var promise = AlarmService.alarm(modal.scope.alarm.id);
					promise.finally(function() {
						modal.scope.$broadcast('scroll.refreshComplete');
					});
					promise.then(function(alarm) {
						modal.scope.alarm = alarm;
					});
				} else {
					$log.debug('Modals.alarmDetail.updateAlarmData: no alarm associated with alarm modal!');
					modal.scope.$broadcast('scroll.refreshComplete');
				}
			};
			modal.scope.clear = function() {
				AlarmService.clear(modal.scope.alarm).then(modal.scope.updateAlarmData, function(err) {
					$log.error('Modals.alarmDetail.clear: error: ' + angular.toJson(err));
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
					$log.error('Modals.alarmDetail.escalate: error: ' + angular.toJson(err));
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
				util.trackView('alarm-detail');
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
			$scope.alarmModal.resolve(modal);
		});

		$ionicModal.fromTemplateUrl(settingsTemplate, {
			scope: $scope.$new(),
			animation: 'slide-in-up'
		}).then(function(modal) {
			modal.scope.show = function(launchAdd) {
				//$scope.launchAddServer = launchAdd;
				modal.scope.launchAddServer = launchAdd;
				util.trackView('settings');
				modal.show();
			};
			modal.scope.hide = function() {
				modal.hide();
			};
			$scope.settingsModal.resolve(modal);
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
			settings: function(launchAdd) {
				$scope.settingsModal.promise.then(function(modal) {
					modal.scope.show(launchAdd);
				});
			}
		};
		return $scope.modals;
	});

}());
