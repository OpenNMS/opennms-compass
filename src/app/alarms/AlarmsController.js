(function() {
	'use strict';

	var angular = require('angular'),
		Alarm = require('./models/Alarm'),
		AlarmFilter = require('./models/AlarmFilter');

	var Constants = require('../misc/Constants');

	require('ionic-filter-bar');
	require('angular-debounce');

	require('./AlarmService');
	require('./OnmsAlarmDirective');

	require('../db/db');
	require('../servers/Servers');

	require('../misc/Cache');
	require('../misc/Capabilities');
	require('../misc/Errors');
	require('../misc/Modals');
	require('../misc/util');

	var alarmsTemplate = require('ngtemplate!./alarms.html');
	var filterTemplate = require('ngtemplate!./alarm-filter.html');
	var loadingTemplate = require('ngtemplate!../misc/loading.html');

	var REFRESH_DELAY = 500;

	angular.module('opennms.controllers.Alarms', [
		'ionic',
		'jett.ionic.filter.bar',
		'angularLocalStorage',
		'rt.debounce',
		'opennms.alarms.Directive',
		'opennms.misc.Cache',
		'opennms.services.Alarms',
		'opennms.services.Capabilities',
		'opennms.services.DB',
		'opennms.services.Errors',
		'opennms.services.Modals',
		'opennms.services.Util',
		'opennms.services.Servers'
	])
	.value('severities', {})
	.config(function($ionicFilterBarConfigProvider, $stateProvider) {
		$stateProvider
			.state('alarms', {
				url: '/alarms',
				templateUrl: alarmsTemplate,
				controller: 'AlarmsCtrl'
			});

		//$ionicFilterBarConfigProvider.theme('')

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
				if ({}.hasOwnProperty.call(severities, key)) {
					ret[sev] = get(sev);
				}
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
			}

			return alarms;
		}

		//severity.$stateful = true;
		return severity;
	})
	.controller('AlarmsCtrl', function($filter, $ionicFilterBar, $ionicHistory, $ionicListDelegate, $ionicLoading, $ionicModal, $ionicPopup, $ionicScrollDelegate, $ionicViewSwitcher, $log, $q, $scope, $timeout, AlarmService, Cache, Capabilities, db, debounce, Errors, Modals, Servers, severityStateTracker, severities, storage, util) {
		$log.info('AlarmsCtrl initializing.');

		var alarmsdb = db.get('alarms');

		var filterParams = storage.get('opennms.alarms.filterParams');
		if (!filterParams) {
			filterParams = {limit:Constants.DEFAULT_REST_LIMIT};
		}

		$scope.modals = Modals;
		$scope.util  = util;
		$scope.alarms = undefined;
		$scope.legend = [];
		$scope.filter = new AlarmFilter(filterParams).reset();
		$scope.showAck = false;
		$scope.severities = severities;

		if (__DEVELOPMENT__) { $log.debug('alarm filter: ' + angular.toJson($scope.filter)); }
		Servers.getDefault().then(function(server) {
			if (server && server.username) {
				$scope.username = server.username;
			}
		});

		var filterBarInstance;
		$scope.titleClicked = function() {
			filterBarInstance = $ionicFilterBar.show({
				items: $scope.alarms,
				debounce: true,
				/*filter: $filter('severity'),*/
				update: function(filteredItems, filterText) {
					$scope.searchString = filterText;
					$scope.alarms = filteredItems;
				}
			});
		};

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

		var getCached = function(type, wrap) {
			return Cache.get('alarms-' + type + '-' + $scope.filter.toQueryString(), wrap);
		};

		var setCached = function(type, results) {
			return Cache.set('alarms-' + type + '-' + $scope.filter.toQueryString(), results).then(function() {
			}).then(function() {
				Errors.clear(type);
				updateErrors();
				//$scope.$broadcast('scroll.refreshComplete');
				$ionicLoading.hide();
			});
		}

		$scope.refreshing = {
			alarms: false,
			alarmSeverities: false
		};

		var setRefreshing = function(type, value) {
			var stillRefreshing = false;
			for (var key in $scope.refreshing) {
				if ($scope.refreshing[key]) {
					stillRefreshing = true;
					break;
				}
			}
			if (!stillRefreshing) {
				$scope.$broadcast('scroll.refreshComplete');
			}
			// if we are hiding the ion-spinner, let it hang around a bit longer
			$timeout(function() {
				$scope.refreshing[type] = value;
			}, value? 0:REFRESH_DELAY); // eslint-disable-line no-magic-numbers
		};

		$scope.scrollToTop = function(animate) {
			var delegate = $ionicScrollDelegate.$getByHandle('alarms-scroll');
			if (delegate) {
				delegate.scrollTop(animate);
			} else {
				$log.warn('No alarms-scroll delegate!');
			}
		};

		var updateCount = 0;
		var updateView = function(type, incoming) {
			$log.debug('updateView(' + type + ',' + (incoming && incoming.length? incoming.length : 0) + ')'); // eslint-disable-line no-magic-numbers
			if (incoming && incoming.length === 0) { // eslint-disable-line no-magic-numbers
				$scope[type] = [];
				return;
			}

			if (updateCount++ !== 0) { // eslint-disable-line no-magic-numbers
				//return;
			}

			var current = angular.copy($scope[type]) || [];
			var newIds = incoming.map(function(alarm) {
				return alarm.id;
			}).sort();
			var oldIds = current.map(function(alarm) {
				return alarm.id;
			}).sort();

			// update existing, add new
			for (var i=0, len=incoming.length, alarm, existingIndex; i < len; i++) {
				alarm = incoming[i];
				existingIndex = oldIds.indexOf(alarm.id);
				if (existingIndex >= 0) { // eslint-disable-line no-magic-numbers
					current[existingIndex] = alarm;
				} else {
					current.push(alarm);
				}
			}

			// remove any that do not exist anymore
			/* eslint-disable no-magic-numbers */
			for (var r=current.length - 1, existingAlarm, newIndex; r >= 0; r--) {
				existingAlarm = current[r];
				newIndex = newIds.indexOf(existingAlarm.id);
				if (newIndex === -1) {
					current.splice(r, 1);
				}
			}
			/* eslint-enable no-magic-numbers */

			var sortFunc = $scope.filter.newestFirst?
				function(a,b) {
					a.lastEventTime.diff(b.lastEventTime);
				} : function(a,b) {
					b.lastEventTime.diff(a.lastEventTime);
				};

			var seen = {};
			current = current.sort(sortFunc).filter(function(alarm) {
				if (!seen[alarm.id]) {
					seen[alarm.id] = true;
					return true;
				}
				return false;
			});

			if (!angular.equals($scope[type], current)) {
				$scope.scrollToTop();
				$scope[type] = current;
			}
			//$scope.$broadcast('scroll.refreshComplete');
		};

		$scope.getAlarms = function() {
			if (!$scope.refreshing.alarmSeverities) {
				setRefreshing('alarmSeverities', true);
				getCached('alarmSeverities').then(function(severities) {
					$scope.legend = severities;
				}).catch(function(err) {
					/*
					$ionicLoading.show({
						templateUrl: loadingTemplate,
						hideOnStateChange: true
					});
					*/
					return $q.reject(err);
				}).finally(function() {
					return AlarmService.severities(new AlarmFilter({limit:100,minimumSeverity:'INDETERMINATE'})).then(function(severities) {
						setCached('alarmSeverities', severities).then(function() {
							$scope.legend = severities;
						});
					}).catch(function(err) {
						setError('alarmSeverities', err);
						return $q.reject(err);
					}).finally(function() {
						setRefreshing('alarmSeverities', false);
					});
				});
			}

			if (!$scope.refreshing.alarms) {
				setRefreshing('alarms', true);
				getCached('alarms', Alarm).then(function(alarms) {
					updateView('alarms', alarms);
				}).catch(function(err) {
					/*
					$ionicLoading.show({
						templateUrl: loadingTemplate,
						hideOnStateChange: true
					});
					*/
					return $q.reject(err);
				}).finally(function() {
					return AlarmService.get($scope.filter).then(function(alarms) {
						setCached('alarms', alarms).then(function() {
							updateView('alarms', alarms);
						});
					}).catch(function(err) {
						setError('alarms', err);
						return $q.reject(err);
					}).finally(function() {
						setRefreshing('alarms', false);
					});
				});
			}
		};

		$scope.refreshImmediately = function() {
			var resetFilter = $scope.filter.reset();
			if (!resetFilter.equals($scope.filter)) {
				$scope.filter = resetFilter;
			}
			$scope.getAlarms();
		};
		$scope.refreshAlarms = debounce(REFRESH_DELAY, $scope.refreshImmediately);

		$scope.openAlarm = function(alarm) {
			$scope.modals.alarm(alarm);
		};

		$scope.canAck = Capabilities.ackAlarms;

		$scope.backToDashboard = function() {
			$ionicViewSwitcher.nextDirection('forward');
			$ionicHistory.goBack();
		};

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
			numericVersion: Constants.OPENNMS_UNKNOWN_VERSION
		};
		util.onInfoUpdated(function(i) {
			$scope.info = i;
		});

		$scope.$watch('filter', function(newFilter, oldFilter) {
			if (!angular.equals(newFilter, oldFilter)) {
				if (!newFilter.equals(oldFilter)) {
					$log.debug('Filter has changed: ' + newFilter.toParams(Constants.OPENNMS_UNKNOWN_VERSION));
					$scope.refreshAlarms();
				}
			} else {
				$log.debug('Filter is unchanged.');
			}
		}, true);

		util.onDirty('alarms', $scope.refreshAlarms);

		/*$scope.$on('modal.hidden', $scope.refreshAlarms);*/
		$scope.$on('$ionicView.beforeEnter', $scope.refreshAlarms);
		$scope.$on('$destroy', function() {
			$scope.modal.remove();
		});
	});

}());
