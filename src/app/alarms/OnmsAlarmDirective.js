'use strict';

var angular = require('angular'),
	Alarm = require('./models/Alarm'),
	AlarmFilter = require('./models/AlarmFilter');

var Constants = require('../misc/Constants');

require('./AlarmService');

require('../misc/Capabilities');
require('../misc/Info');
require('../misc/Modals');
require('../misc/util');

var itemTemplate = require('ngtemplate!./onms-alarm.html');

angular.module('opennms.alarms.Directive', [
	'ionic',
	'opennms.services.Alarms',
	'opennms.services.Capabilities',
	'opennms.services.Info',
	'opennms.services.Modals',
	'opennms.services.Servers',
	'opennms.services.Util'
])
.directive('onmsAlarm', function($ionicListDelegate, $ionicPopup, $log, AlarmService, Capabilities, Info, Modals, Servers, util) {
	var username,
		info = Info.get();

	Servers.getDefault().then(function(server) {
		if (server && server.username) {
			username = server.username;
		}
	});

	util.onInfoUpdated(function(i) {
		info = i;
	});
	util.onDefaultServerUpdated(function(defaultServer) {
		if (defaultServer && defaultServer.username) {
			username = defaultServer.username;
		} else {
			username = undefined;
		}
	});

	return {
		scope: {
			alarmObj: '=alarm',
			alarmId: '='
		},
		restrict: 'E',
		replace: false,
		transclude: true,
		templateUrl: itemTemplate,
		link: function($scope, element, attrs) {
			/* Private methods */
			var getAlarm = function(alarmId) {
				AlarmService.alarm(alarmId).then(function(alarm) {
					//$log.debug('onms-alarm: got alarm: ' + alarm.uei);
					$scope.alarm = alarm;
				});
			};

			/* Decorations */
			$scope.getItemClass = function(alarm) {
				return 'onms-alarm item item-text-wrap severity-' + alarm.severity;
			};
			$scope.getIconClass = function(alarm) {
				return 'icon severity severity-' + alarm.severity + ' ' + util.icon(alarm.severity);
			};

			var closeDrawer = function() {
				//$ionicListDelegate.$getByHandle('alarms-scroll').closeOptionButtons();
				$ionicListDelegate.closeOptionButtons();
			};

			/* Actions */
			$scope.openAlarm = function(alarm) {
				closeDrawer();
				Modals.alarm(alarm);
			};

			$scope.canAck = Capabilities.ackAlarms;

			$scope.toggleAck = function(alarm, e) {
				e.preventDefault();
				e.stopPropagation();
				if (alarm.ackUser) {
					var oldAckUser = alarm.ackUser;
					alarm.ackUser = undefined;
					AlarmService.unacknowledge(alarm).catch(function(err) {
						alarm.ackUser = oldAckUser;
						if (err.permissionDenied()) {
							$ionicPopup.alert({
								title: 'Permission Denied',
								template: '<p>Unable to unacknowledge alarm.</p>\n' +
									'User "' + username + '" does not have permission to unacknowledge alarms.',
								okType: 'button-assertive'
							});
						}
					});
				} else {
					alarm.ackUser = 'unknown';
					AlarmService.acknowledge(alarm).catch(function(err) {
						alarm.ackUser = undefined;
						if (err.permissionDenied()) {
							$ionicPopup.alert({
								title: 'Permission Denied',
								template: '<p>Unable to acknowledge alarm.</p>\n' +
									'User "' + username + '" does not have permission to acknowledge alarms.',
								okType: 'button-assertive'
							});
						}
					});
				}
				closeDrawer();
			};

			$scope.canClear = function(alarm) {
				return info.numericVersion != Constants.OPENNMS_UNKNOWN_VERSION && alarm.severity !== 'CLEARED'; // eslint-disable-line eqeqeq
			};

			$scope.clear = function(alarm, e) {
				e.preventDefault();
				e.stopPropagation();
				var oldSeverity = alarm.severity;
				alarm.severity = 'CLEARED';
				AlarmService.clear(alarm).catch(function(err) {
					alarm.severity = oldSeverity;
					if (err.permissionDenied()) {
						$ionicPopup.alert({
							title: 'Permission Denied',
							template: '<p>Unable to clear alarm.</p>\n' +
								'User "' + username + '" does not have permission to clear alarms.',
							okType: 'button-assertive'
						});
					}
				});
				closeDrawer();
			};

			$scope.canEscalate = function(alarm) {
				return info.numericVersion != Constants.OPENNMS_UNKNOWN_VERSION && alarm.severity !== 'CRITICAL'; // eslint-disable-line eqeqeq
			};

			$scope.escalate = function(alarm, e) {
				e.preventDefault();
				e.stopPropagation();
				AlarmService.escalate(alarm).catch(function(err) {
					if (err.permissionDenied()) {
						$ionicPopup.alert({
							title: 'Permission Denied',
							template: '<p>Unable to escalate alarm.</p>\n' +
								'User "' + username + '" does not have permission to escalate alarms.',
							okType: 'button-assertive'
						});
					}
				});
				closeDrawer();
			};


			/* Setup */
			if ($scope.alarmObj) {
				$scope.alarm = $scope.alarmObj;
				//$log.debug('onms-alarm: got alarm: ' + $scope.alarm.uei);
			} else {
				if ($scope.alarmId) {
					getAlarm($scope.alarmId);
				} else {
					$log.warn('onms-alarm: no alarm!');
				}
			}

			//$log.debug(angular.toJson($scope.alarmObj));
			$scope.$watchGroup(['alarmObj', 'alarmId'], function(updated, previous) {
				if (updated[0]) {
					$scope.alarm = updated[0];
				} else if (updated[1]) {
					getAlarm(updated[1]);
				}
			});
		}
	}
});
