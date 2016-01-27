(function() {
	'use strict';

	var angular = require('angular'),
		AlarmFilter = require('./AlarmFilter');

	require('./AlarmService');

	require('../servers/Servers');

	require('../misc/Errors');
	require('../misc/Modals');
	require('../misc/util');

	var alarmsTemplate = require('ngtemplate!html!./alarms.html');
	var filterTemplate = require('ngtemplate!html!./alarm-filter.html');
	var loadingTemplate = require('ngtemplate!html!../misc/loading.html');

	angular.module('opennms.controllers.Alarms', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Alarms',
		'opennms.services.Errors',
		'opennms.services.Modals',
		'opennms.services.Util',
		'opennms.services.Servers'
	])
	.value('severities', {})
	.config(function($stateProvider) {
		$stateProvider
		.state('alarms', {
			url: '/alarms',
			templateUrl: alarmsTemplate,
			controller: 'AlarmsCtrl'
		});
	})
	.factory('severityStateTracker', function(util, severities) {
		/* jshint -W003: true */
		/* jshint -W026: true */

		var severityNames = util.severities();

		for (var i=0, len=severityNames.length; i < len; i++) {
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
	.controller('AlarmsCtrl', function($q, $scope, $log, $timeout, $ionicListDelegate, $ionicLoading, $ionicModal, $ionicPopup, $ionicScrollDelegate, $ionicViewSwitcher, storage, util, AlarmService, Errors, Modals, Servers, severityStateTracker, severities) {
		$log.info('AlarmsCtrl initializing.');

		var filterParams = storage.get('opennms.alarms.filterParams');
		if (!filterParams) {
			filterParams = {limit:100};
		}

		$scope.modals = Modals;
		$scope.util  = util;
		$scope.alarms = undefined;
		$scope.legend = [];
		$scope.filter = new AlarmFilter(filterParams).reset();
		$scope.showAck = false;
		$scope.severities = severities;

		$log.debug('alarm filter: ' + angular.toJson($scope.filter));
		Servers.getDefault().then(function(server) {
			if (server && server.username) {
				$scope.username = server.username;
			}
		});

		$scope.toggleSeverity = function(item) {
			severityStateTracker.toggle(item.severity);
			//$log.debug(item.severity + '=' + severityStateTracker.get(item.severity));
		};

		$ionicModal.fromTemplateUrl(filterTemplate, {
			scope: $scope,
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.modal = modal;
			modal.scope.$on('modal.hidden', function() {
				storage.set('opennms.alarms.filterParams', $scope.filter);
			});
		});

		var sortAlarms = function(a, b) {
			return a.id - b.id;
		};

		$scope.getAlarms = function() {
			$ionicLoading.show({
				templateUrl: loadingTemplate,
				hideOnStateChange: true
			});

			AlarmService.get($scope.filter).then(function(alarms) {
				//$log.debug('got alarms=',alarms);
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
								'User "' + $scope.username + '" does not have permission to unacknowledge alarms.',
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
								'User "' + $scope.username + '" does not have permission to acknowledge alarms.',
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
							'User "' + $scope.username + '" does not have permission to clear alarms.',
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
							'User "' + $scope.username + '" does not have permission to escalate alarms.',
						okType: 'button-assertive'
					});
				}
			});
			$ionicListDelegate.closeOptionButtons();
		};

		util.onDirty('alarms', $scope.refreshAlarms);
		util.onDefaultServerUpdated(function(defaultServer) {
			if (defaultServer && defaultServer.username) {
				$scope.username = defaultServer.username;
			} else {
				$scope.username = undefined;
			}
		});

		$scope.$on('modal.hidden', $scope.refreshAlarms);
		$scope.$on('$ionicView.beforeEnter', $scope.refreshAlarms);
		$scope.$on('$destroy', function() {
			$scope.modal.remove();
		});
	});

}());