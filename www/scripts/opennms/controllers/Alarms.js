(function() {
	'use strict';

	/* global ionic: true */
	/* global AlarmFilter: true */

	angular.module('opennms.controllers.Alarms', [
		'ionic',
		'opennms.services.Alarms',
		'opennms.services.Errors',
		'opennms.services.Modals',
		'opennms.services.Util',
		'opennms.services.Settings',
	])
	.value('severities', {})
	.factory('severityStateTracker', function(util, severities) {
		/* jshint -W003: true */
		/* jshint -W026: true */

		var severityNames = util.severities();
		for (var i=0; i < severityNames.length; i++) {
			severities[severityNames[i]] = true;
		}

		var service = {
			get: get,
			all: all,
			isEnabled: isEnabled,
			enable: enable,
			disable: disable,
			toggle: toggle
		};
		return service;

		function isEnabled(severity) {
			return severities[severity];
		}

		function enable(severity) {
			severities[severity] = true;
		}

		function disable(severity) {
			severities[severity] = false;
		}

		function get(severity) {
			return isEnabled(severity)? 'enabled':'disabled';
		}

		function all() {
			var ret = {};
			for (var sev in severities) {
				ret[sev] = get(sev);
			}
			return ret;
		}

		function toggle(severity) {
			severities[severity] = !isEnabled(severity);
		}
	})
	.filter('severity', function(severities) {
		function severity(alarms) {
			if (alarms) {
				return alarms.filter(function(alarm) {
					return severities[alarm.severity];
				});
			} else {
				return alarms;
			}
		}

		//severity.$stateful = true;
		return severity;
	})
	.controller('AlarmsCtrl', function($q, $scope, $timeout, $ionicListDelegate, $ionicLoading, $ionicModal, $ionicPopup, $ionicScrollDelegate, $ionicViewSwitcher, util, AlarmService, Errors, Modals, Settings, severityStateTracker, severities) {
		console.log('AlarmsCtrl initializing.');

		$scope.modals = Modals;
		$scope.util  = util;
		$scope.alarms = undefined;
		$scope.legend = [];
		$scope.filter = new AlarmFilter({limit:100});
		$scope.showAck = false;
		$scope.severities = severities;

		$scope.toggleSeverity = function(item) {
			severityStateTracker.toggle(item.severity);
			//console.log(item.severity + '=' + severityStateTracker.get(item.severity));
		};

		$ionicModal.fromTemplateUrl('templates/alarm-filter.html', {
			scope: $scope,
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.modal = modal;
		});

		var sortAlarms = function(a, b) {
			return a.id - b.id;
		};

		$scope.getAlarms = function() {
			$ionicLoading.show({
				noBackdrop: true
			});

			AlarmService.get($scope.filter).then(function(alarms) {
				//console.log('got alarms=',alarms);
				$scope.alarms = alarms;
				if (!$scope.alarms) {
					$scope.alarms = [];
				}

				Errors.clear('alarms');

				delete $scope.error;
				$scope.$broadcast('scroll.refreshComplete');
				$ionicLoading.hide();
			}, function(err) {
				Errors.set('alarms', err);
				$scope.error = err;
				$scope.alarms = [];
				$scope.$broadcast('scroll.refreshComplete');
				$ionicLoading.hide();
			});

			AlarmService.severities(new AlarmFilter({limit:100,minimumSeverity:'INDETERMINATE'})).then(function(severities) {
				$scope.legend = severities;
			});
		};

		$scope.refreshAlarms = function() {
			$timeout(function() {
				var delegate = $ionicScrollDelegate.$getByHandle('alarms-scroll');
				if (delegate) {
					delegate.scrollTop();
				}
				$scope.filter = $scope.filter.reset();
				$scope.getAlarms();
			});
		};

		var doThenRefresh = function(promise) {
			promise['finally'](function() {
				util.dirty('alarms');
			});
		};

		$scope.openAlarm = function(alarm) {
			$scope.modals.alarm(alarm);
		};

		$scope.toggleAck = function(alarm, e) {
			e.preventDefault();
			e.stopPropagation();
			if (alarm.ackUser) {
				AlarmService.unacknowledge(alarm).then(undefined, function(err) {
					if (err.permissionDenied()) {
						$ionicPopup.alert({
							title: 'Permission Denied',
							template: '<p>Unable to unacknowledge alarm.</p>\n' +
								'User "' + Settings.username() + '" does not have permission to unacknowledge alarms.',
							okType: 'button-assertive'
						});
					}
				});
			} else {
				AlarmService.acknowledge(alarm).then(undefined, function(err) {
					if (err.permissionDenied()) {
						$ionicPopup.alert({
							title: 'Permission Denied',
							template: '<p>Unable to acknowledge alarm.</p>\n' +
								'User "' + Settings.username() + '" does not have permission to acknowledge alarms.',
							okType: 'button-assertive'
						});
					}
				});
			}
			$ionicListDelegate.closeOptionButtons();
		};

		$scope.clear = function(alarm, e) {
			e.preventDefault();
			e.stopPropagation();
			AlarmService.clear(alarm).then(undefined, function(err) {
				if (err.permissionDenied()) {
					$ionicPopup.alert({
						title: 'Permission Denied',
						template: '<p>Unable to clear alarm.</p>\n' +
							'User "' + Settings.username() + '" does not have permission to clear alarms.',
						okType: 'button-assertive'
					});
				}
			});
			$ionicListDelegate.closeOptionButtons();
		};

		$scope.escalate = function(alarm, e) {
			e.preventDefault();
			e.stopPropagation();
			AlarmService.escalate(alarm).then(undefined, function(err) {
				if (err.permissionDenied()) {
					$ionicPopup.alert({
						title: 'Permission Denied',
						template: '<p>Unable to escalate alarm.</p>\n' +
							'User "' + Settings.username() + '" does not have permission to escalate alarms.',
						okType: 'button-assertive'
					});
				}
			});
			$ionicListDelegate.closeOptionButtons();
		};

		util.onDirty('alarms', $scope.refreshAlarms);

		$scope.$on('modal.hidden', $scope.refreshAlarms);
		$scope.$on('$ionicView.beforeEnter', $scope.refreshAlarms);
		$scope.$on('$destroy', function() {
			$scope.modal.remove();
		});
	});

}());