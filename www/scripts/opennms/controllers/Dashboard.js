(function() {
	'use strict';

	var severityOrder = [
		'INDETERMINATE',
		'CLEARED',
		'NORMAL',
		'WARNING',
		'MINOR',
		'MAJOR',
		'CRITICAL'
	];

	var sortAlarmData = function(a, b) {
		return severityOrder.indexOf(b.label.toUpperCase()) - severityOrder.indexOf(a.label.toUpperCase());
	};

	/* global $: true */
	/* global ionic: true */
	/* global d3pie: true */
	/* global AlarmFilter: true */
	/* global DonutWidget: true */

	angular.module('opennms.controllers.Dashboard', [
		'ionic',
		'ngResize',
		'opennms.services.Alarms',
		'opennms.services.Availability',
		'opennms.services.Errors',
		'opennms.services.Info',
		'opennms.services.Modals',
		'opennms.services.Outages',
		'opennms.services.Settings',
		'opennms.services.Util',
	])
	.controller('DashboardCtrl', function($q, $rootScope, $scope, $interval, $timeout, $state, $document, $window, $ionicLoading, $ionicPopup, $ionicSlideBoxDelegate, resize, AlarmService, AvailabilityService, Errors, Info, Modals, OutageService, Settings, util) {
		console.log('DashboardCtrl: Initializing.');

		var updateArrows = function(height) {
			//console.log('updateArrows(' + height +')');
			var arrowOffset = (Math.round(height * 0.5) - 50);

			var outageArrow = document.getElementById('outage-arrow');
			if (outageArrow) {
				outageArrow.style.top = arrowOffset + 'px';
			}

			var alarmArrow = document.getElementById('alarm-arrow');
			if (alarmArrow) {
				alarmArrow.style.top = arrowOffset + 'px';
			}
		};

		var outageDonut = new DonutWidget({
			elementId: 'outages',
			pieOptions: {
				footer: {
					text: 'Outages By Service',
					location: 'bottom-center',
					color: 'black',
				},
			}
		});
		var alarmDonut = new DonutWidget({
			elementId: 'alarms',
			pieOptions: {
				data: {
					sortOrder: 'none'
				},
				footer: {
					text: 'Unacknowleged Alarms By Severity',
					location: 'bottom-center',
					color: 'black',
				},
			}
		});

		var onWidget = function(info) {
			//console.log('onDirty: ' + angular.toJson(info));
			$scope.$broadcast('scroll.refreshComplete');
			$rootScope.landscape = info.landscape;
			$scope.landscape     = info.landscape;
			$scope.width         = info.width;
			$scope.height        = info.height;

			updateArrows(info.height);
		};
		outageDonut.onDirty = onWidget;
		alarmDonut.onDirty = onWidget;
		outageDonut.onRedraw = onWidget;
		alarmDonut.onRedraw = onWidget;

		$scope.refreshSlide = function(index) {
			$scope.currentSlide = index;
			if (index === 0) {
				outageDonut.refresh();
			} else if (index === 1) {
				alarmDonut.refresh();
			} else {
				console.log('WTF?  slide=' + index);
			}
		};

		var shouldHideDonut = {
			alarms: true,
			outages: true
		};

		var hideDonut = function(type, value) {
			if (value === true) {
				shouldHideDonut[type] = true;
			} else {
				setTimeout(function() {
					shouldHideDonut[type] = false;
				}, 50);
			}
		};

		$scope.donutClass = function(type) {
			if (shouldHideDonut[type]) {
				return 'invisible';
			} else {
				return '';
			}
		};

		var updateLogo = function() {
			Info.get().then(function(info) {
				if (info.packageName === 'meridian') {
					$scope.logo = 'images/meridian.svg';
				} else {
					$scope.logo = 'images/horizon.svg';
				}
			});
		};

		var refreshing = false;
		$scope.refreshData = function() {
			if (refreshing) {
				return;
			}
			refreshing = true;

			//console.log('DashboardCtrl.refreshData: refreshing data.');
			updateLogo();

			// if we have never loaded before, show the loading thingy
			if (!$scope.loaded) {
				$ionicLoading.show();
			}

			var outagePromise = OutageService.get();
			var availabilityPromise = AvailabilityService.availability();
			var alarmPromise = AlarmService.severities();

			$q.all([outagePromise, alarmPromise, availabilityPromise])['finally'](function() {
				$timeout(function() {
					refreshing = false;
					$ionicLoading.hide();
					$scope.loaded = true;
				}, 50);
				$scope.$broadcast('scroll.refreshComplete');
			});

			availabilityPromise.then(function(results) {
				Errors.clear('availability');
				$scope.availability = results;
			}, function(err) {
				Errors.set('availability', err);
				$scope.availability = undefined;
			});

			outagePromise.then(function(results) {
				var data = {}, outages = [], outage, service, total = 0, i;

				for (i=0; i < results.length; i++) {
					outage = results[i];
					service = outage.monitoredService.serviceName;
					if (!data[service]) {
						data[service] = 1;
					} else {
						data[service]++;
					}
					total++;
				}

				for (service in data) {
					if (data.hasOwnProperty(service) && data[service]) {
						outages.push({
							'label': service,
							'value': data[service]
						});
					}
				}
				outages.sort(function(a, b) {
					var ret = b.value - a.value;
					if (ret === 0) {
						return a.label.localeCompare(b.label);
					} else {
						return ret;
					}
				});
				if (outages.length > 50) {
					outages.length = 50;
				}

				Errors.clear('outage-chart');
				hideDonut('outages', false);
				outageDonut.setData(outages);
				outageDonut.setTitle(total);
			}, function(err) {
				Errors.set('outage-chart', err);
				hideDonut('outages', true);
				outageDonut.setData([]);
				outageDonut.setTitle(0);
			});


			alarmPromise.then(function(results) {
				var severities = [], severity, total = 0;

				for (var i=0; i < results.length; i++) {
					severity = results[i];
					total += severity.count;
					severities.push({
						'label': severity.severity.capitalize(),
						'value': severity.count,
						'color': util.color(severity.severity)
					});
				}

				Errors.clear('alarm-chart');
				hideDonut('alarms', false);
				alarmDonut.setData(severities);
				alarmDonut.setTitle(total);
			}, function(err) {
				Errors.set('alarm-chart', err);
				hideDonut('alarms', true);
				alarmDonut.setData([]);
				alarmDonut.setTitle(0);
			});
		};

		$scope.goToSlide = function(slide) {
			$ionicSlideBoxDelegate.$getByHandle('donut-slide-box').slide(slide);
		};

		$scope.$on('opennms.settings.changed', function(ev, newSettings, oldSettings, changedSettings) {
			//console.log('Dashboard: settings changed, refreshing data.');
			$scope.serverName = Settings.getServerName();
			updateLogo();
			$scope.refreshData();
		});

		$scope.util = util;
		$scope.modals = Modals;
		$scope.e = Errors;
		$scope.errors = [];
		$scope.currentSlide = 0;
		$scope.landscape = true;
		updateLogo();

		$scope.serverName = Settings.getServerName();
		$scope.$on('opennms.errors.updated', function(ev, errors) {
			$scope.errors = Errors.get();
		});
		$scope.$on('$ionicView.beforeEnter', function() {
			ionic.trigger('resize', {target:window});
			$scope.refreshData();
		});
	});

}());
