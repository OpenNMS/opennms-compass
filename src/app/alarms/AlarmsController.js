(function() {
	'use strict';

	var angular = require('angular'),
		Alarm = require('./Alarm'),
		AlarmFilter = require('./AlarmFilter');

	require('angular-debounce');

	require('./AlarmService');

	require('../db/db');
	require('../servers/Servers');

	require('../misc/Errors');
	require('../misc/Modals');
	require('../misc/util');

	var alarmsTemplate = require('ngtemplate!./alarms.html');
	var filterTemplate = require('ngtemplate!./alarm-filter.html');
	var loadingTemplate = require('ngtemplate!../misc/loading.html');

	angular.module('opennms.controllers.Alarms', [
		'ionic',
		'angularLocalStorage',
		'rt.debounce',
		'opennms.services.Alarms',
		'opennms.services.DB',
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
	.controller('AlarmsCtrl', function($ionicListDelegate, $ionicLoading, $ionicModal, $ionicPopup, $ionicScrollDelegate, $ionicViewSwitcher, $log, $q, $scope, $timeout, AlarmService, db, debounce, Errors, Modals, Servers, severityStateTracker, severities, storage, util) {
		$log.info('AlarmsCtrl initializing.');

		var alarmsdb = db.get('alarms');

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

		var getCached = function(type, wrap) {
			return Servers.getDefault().then(function(defaultServer) {
				var currentFilter = new AlarmFilter($scope.filter).reset();
				return alarmsdb.get(type).then(function(res) {
					if (res && res.filter) {
						res.filter = new AlarmFilter(res.filter).reset();
					}
					if (currentFilter.equals(res.filter) && res.server === defaultServer._id && res.results) {
						res.results = angular.fromJson(res.results);
						if (wrap) {
							for (var i=0, len=res.results.length; i < len; i++) {
								res.results[i] = new wrap(res.results[i]);
							}
						}
						$log.debug('AlarmsController.getCached(' + type + '): returning ' + res.results.length + ' entries');
						return res.results;
					} else {
						return $q.reject('no match');
					}
				});
			}).catch(function(err) {
				$log.warn('AlarmsController.getCached: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var updateErrors = function() {
			if (Errors.hasError('alarms')) {
				$scope.error = Errors.get('alarms');
			} else if (Errors.hasError('alarmSeverities')) {
				$scope.error = Errors.get('alarmSeverities');
			} else {
				delete $scope.error;
			}
		};

		var setError = function(type, err) {
			Errors.set('alarms', err);
			updateErrors();
			$scope.$broadcast('scroll.refreshComplete');
			$ionicLoading.hide();
		};

		var setCached = function(type, results) {
			return Servers.getDefault().then(function(defaultServer) {
				var currentFilter = new AlarmFilter($scope.filter).reset();
				return db.upsert('alarms', {
					_id: type,
					filter: currentFilter,
					server: defaultServer._id,
					results: angular.toJson(results)
				}).then(function() {
					Errors.clear(type);
					updateErrors();
					//$scope.$broadcast('scroll.refreshComplete');
					$ionicLoading.hide();
				});
			});
		}

		$scope.refreshing = {
			alarms: false,
			alarmSeverities: false
		};

		var setRefreshing = function(type, value) {
			// if we are hiding the ion-spinner, let it hang around a half second longer
			$timeout(function() {
				$scope.refreshing[type] = value;
			}, value? 0:500);
		};

		var updateView = function(type, incoming) {
			if (incoming && incoming.length === 0) {
				delete $scope[type];
				return;
			}

			var current = $scope[type] || [];
			var newIds = incoming.map(function(alarm) {
				return alarm.id;
			});
			var oldIds = current.map(function(alarm) {
				return alarm.id;
			});

			// update existing, add new
			for (var i=0, len=incoming.length, alarm, existingIndex; i < len; i++) {
				alarm = incoming[i];
				existingIndex = oldIds.indexOf(alarm.id);
				if (existingIndex >= 0) {
					current[existingIndex] = alarm;
				} else {
					current.push(alarm);
				}
			}
			for (var i=current.length - 1, alarm, newIndex; i >= 0; i--) {
				alarm = current[i];
				newIndex = newIds.indexOf(alarm.id);
				if (newIndex === -1) {
					current.splice(i, 1);
				}
			}

			var sortFunc = $scope.filter.newestFirst?
				function(a,b) {
					a.lastEventTime.diff(b.lastEventTime);
				} : function(a,b) {
					b.lastEventTime.diff(a.lastEventTime);
				};

			current.sort(sortFunc);

			$scope[type] = current;
		};

		$scope.getAlarms = function() {
			if (!$scope.refreshing.alarms) {
				setRefreshing('alarms', true);
				getCached('alarms', Alarm).then(function(alarms) {
					updateView('alarms', alarms);
					//$scope.alarms = alarms;
				}).catch(function() {
					$ionicLoading.show({
						templateUrl: loadingTemplate,
						hideOnStateChange: true
					});
				}).finally(function() {
					return AlarmService.get($scope.filter).then(function(alarms) {
						setCached('alarms', alarms).then(function() {
							updateView('alarms', alarms);
							//$scope.alarms = alarms;
						});
					}).catch(function(err) {
						setError('alarms', err);
					}).finally(function() {
						setRefreshing('alarms', false);
					});
				});
			}

			if (!$scope.refreshing.alarmSeverities) {
				setRefreshing('alarmSeverities', true);
				getCached('alarmSeverities').then(function(severities) {
					$scope.legend = severities;
				}).catch(function() {
					$ionicLoading.show({
						templateUrl: loadingTemplate,
						hideOnStateChange: true
					});
				}).finally(function() {
					return AlarmService.severities(new AlarmFilter({limit:100,minimumSeverity:'INDETERMINATE'})).then(function(severities) {
						setCached('alarmSeverities', severities).then(function() {
							$scope.legend = severities;
						});
					}).catch(function(err) {
						setError('alarmSeverities', err);
					}).finally(function() {
						setRefreshing('alarmSeverities', false);
					});
				});
			}
		};

		$scope.refreshAlarms = debounce(500, function() {
			var delegate = $ionicScrollDelegate.$getByHandle('alarms-scroll');
			if (delegate) {
				delegate.scrollTop();
			}
			$scope.filter = $scope.filter.reset();
			$scope.getAlarms();
		});

		$scope.openAlarm = function(alarm) {
			$scope.modals.alarm(alarm);
		};

		$scope.canAck = function(alarm) {
			/* eslint-disable eqeqeq */
			if ($scope.info.numericVersion == 0.0) {
				return false;
			} else {
				return true;
			}
			/* eslint-enable eqeqeq */
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

		$scope.canClear = function(alarm) {
			/* eslint-disable eqeqeq */
			if ($scope.info.numericVersion == 0.0 || alarm.severity === 'CLEARED') {
				return false;
			} else {
				return true;
			}
			/* eslint-enable eqeqeq */
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

		$scope.canEscalate = function(alarm) {
			/* eslint-disable eqeqeq */
			if ($scope.info.numericVersion == 0.0 || alarm.severity === 'CRITICAL') {
				return false;
			} else {
				return true;
			}
			/* eslint-enable eqeqeq */
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

		/*
		$scope.$watch('alarms', function(newValue, oldValue) {
			if (newValue) {
				$log.error('alarms changed: ' + newValue.length + ' items');
			}
		});
		*/

		util.onDirty('alarms', $scope.refreshAlarms);
		util.onDefaultServerUpdated(function(defaultServer) {
			if (defaultServer && defaultServer.username) {
				$scope.username = defaultServer.username;
			} else {
				$scope.username = undefined;
			}
			$scope.alarms = [];
			$scope.refreshAlarms();
		});
		$scope.info = {
			numericVersion: 0.0
		};
		util.onInfoUpdated(function(i) {
			$scope.info = i;
		});

		$scope.$on('modal.hidden', $scope.refreshAlarms);
		$scope.$on('$ionicView.beforeEnter', $scope.refreshAlarms);
		$scope.$on('$destroy', function() {
			$scope.modal.remove();
		});
	});

}());
