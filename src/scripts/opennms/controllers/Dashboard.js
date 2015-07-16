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
		'rt.debounce',
		'opennms.services.Alarms',
		'opennms.services.Availability',
		'opennms.services.DonutWidget',
		'opennms.services.Errors',
		'opennms.services.Info',
		'opennms.services.Modals',
		'opennms.services.Outages',
		'opennms.services.Resources',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util',
	])
	.controller('DashboardCtrl', function($q, $rootScope, $scope, $interval, $timeout, $state, $document, $window, $ionicLoading, $ionicPopup, $ionicPopover, $ionicSlideBoxDelegate, debounce, resize, AlarmService, AvailabilityService, DonutWidget, Errors, Info, Modals, OutageService, ResourceService, Servers, Settings, util) {
		console.log('DashboardCtrl: Initializing.');

		var updateArrows = function(height) {
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
					text: 'Pending Problems',
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

		$scope.refreshDonutSlide = function(index) {
			$scope.currentDonutSlide = index;
			if (index === 0) {
				outageDonut.refresh();
			} else if (index === 1) {
				alarmDonut.refresh();
			} else {
				console.log('WTF?  DonutSlide=' + index);
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

		var updateLogo = function(info) {
			if (!info) {
				info = Info.get();
			}
			if (info.packageName === 'meridian') {
				$scope.logo = 'images/meridian.svg';
			} else {
				$scope.logo = 'images/horizon.svg';
			}
		};

		var refreshFavorites = function() {
			//console.log('refreshing favorites');
			$scope.graphs = {};
			$scope.favoriteGraphs = [];
			return ResourceService.favorites().then(function(favs) {
				var i, favorite,
					length = favs.length,
					graphPromises = [];

				for (i=0; i < length; i++) {
					favorite = favs[i];
					graphPromises.push(ResourceService.graph(favorite.graphName));
				}

				return $q.all(graphPromises).then(function(gds) {
					var graphDefs = {}, def;
					length = gds.length;
					for (i=0; i < length; i++) {
						def = gds[i];
						graphDefs[def.name] = def;
					}

					if ($scope.currentGraphSlide >= favs.length) {
						// "current" graph is now higher than the number of graphs we have
						$scope.currentGraphSlide = 0;
					}
					$scope.graphs = graphDefs;
					$scope.favoriteGraphs = favs;

					var delegate = $ionicSlideBoxDelegate.$getByHandle('graph-slide-box');
					delegate.slide($scope.currentGraphSlide);
					delegate.update();
				});
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});
		};

		var refreshAvailability = function() {
			return AvailabilityService.availability().then(function(results) {
				Errors.clear('availability');
				$scope.availability = results;
				return results;
			}, function(err) {
				Errors.set('availability', err);
				$scope.availability = undefined;
				return $q.reject(err);
			});

		};

		var refreshOutages = function() {
			return OutageService.get().then(function(results) {
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
				return outages;
			}, function(err) {
				Errors.set('outage-chart', err);
				hideDonut('outages', true);
				outageDonut.setData([]);
				outageDonut.setTitle(0);
				return $q.reject(err);
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});

		};

		var refreshAlarms = function() {
			return AlarmService.severities().then(function(results) {
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
				return severities;
			}, function(err) {
				Errors.set('alarm-chart', err);
				hideDonut('alarms', true);
				alarmDonut.setData([]);
				alarmDonut.setTitle(0);
				return $q.reject(err);
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});

		};

		var refreshing = false;
		$scope.refreshData = debounce(1000, function() {
			if (refreshing) {
				return;
			}
			refreshing = true;

			console.log('DashboardCtrl.refreshData: refreshing data.');

			var finished = function(type) {
				util.hideSplashscreen();
				$timeout(function() {
					refreshing = false;
					$ionicLoading.hide();
					$scope.$broadcast('scroll.refreshComplete');
				}, 50);
			};

			$q.all([
				refreshAvailability(),
				refreshOutages(),
				refreshAlarms(),
				refreshFavorites(),
			]).finally(function() {
				finished();
			});
		});

		$scope.unfavorite = function(favorite) {
			var graphTitle = ($scope.graphs && $scope.graphs[favorite.graphName])? $scope.graphs[favorite.graphName].title : 'graph';
			return $ionicPopup.confirm({
				title: 'Remove Favorite',
				template: 'Remove ' + graphTitle + ' from favorites?',
				okType: 'button-compass',
			}).then(function(confirmed) {
				if (confirmed) {
					return ResourceService.unfavorite(favorite.resourceId, favorite.graphName).then(function() {
						return refreshFavorites();
					});
				} else {
					return $q.reject('Canceled favorite removal.');
				}
			});
		};

		$scope.refreshGraphSlide = function(index) {
			$scope.currentGraphSlide = index;
		};

		$scope.shouldRenderGraph = function(index) {
			//return $scope.currentGraphSlide === index;
			return ($scope.currentGraphSlide >= (index - 1) && $scope.currentGraphSlide <= (index + 1));
		};

		$scope.goToDonutSlide = function(slide) {
			$ionicSlideBoxDelegate.$getByHandle('donut-slide-box').slide(slide);
		};

		$scope.showSelectServer = function($event) {
			Servers.all().then(function(servers) {
				$scope.serverPopover.scope.servers = servers;
				return $scope.serverPopover.show($event);
			});
		};

		$scope.hideSelectServer = function() {
			$scope.serverPopover.hide();
		};

		$ionicPopover.fromTemplateUrl('templates/server-popover.html', {
			scope: $scope
		}).then(function(popover) {
			$scope.serverPopover = popover;
			popover.scope.selectServer = function(server) {
				$ionicLoading.show({templateUrl: 'templates/loading.html', duration: 5000});
				popover.hide();
				Settings.setDefaultServerName(server.name);
			};
		});

		$scope.util = util;
		$scope.modals = Modals;
		$scope.e = Errors;
		$scope.errors = [];
		$scope.currentDonutSlide = 0;
		$scope.currentGraphSlide = 0;
		$scope.landscape = true;
		Settings.getDefaultServerName().then(function(serverName) {
			$scope.serverName = serverName;
		});

		$scope.range = {
			end: new Date()
		};
		$scope.range.start = new Date($scope.range.end.getTime() - (1*60*60*1000)); // 1 hour

		updateLogo();

		util.onSettingsUpdated(function(newSettings, oldSettings, changedSettings) {
			console.log('Dashboard: settings changed, refreshing data.');
			if (changedSettings.defaultServerName) {
				$scope.serverName = changedSettings.defaultServerName;
				$scope.refreshData();
			}
		});

		util.onDirty('alarms', $scope.refreshData);
		util.onDirty('outages', $scope.refreshData);
		util.onInfoUpdated(updateLogo);
		util.onErrorsUpdated(function(errors) {
			$scope.errors = errors;
		});

		$scope.$on('$destroy', function() {
			outageDonut.destroy();
			outageDonut = undefined;
			alarmDonut.destroy();
			alarmDonut = undefined;
			$scope.serverPopover.remove();
			delete $scope.serverPopover;
		});

		$scope.$on('$ionicView.beforeEnter', function() {
			/* ionic.trigger('resize', {target:window}); */
			$scope.refreshData();
		});
	});

}());
