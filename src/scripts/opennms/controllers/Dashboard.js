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
	.controller('DashboardCtrl', function($q, $rootScope, $scope, $injector, $interval, $log, $timeout, $state, $document, $window, $ionicLoading, $ionicPopup, $ionicPopover, $ionicSlideBoxDelegate, debounce, resize, AlarmService, AvailabilityService, DonutWidget, Errors, Info, Modals, OutageService, ResourceService, Servers, Settings, util) {
		$log.info('DashboardCtrl: Initializing.');

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
			//$log.debug('onDirty: ' + angular.toJson(info));
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
				$log.error('WTF?  DonutSlide=' + index);
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

		var sortFavorites = function(a, b) {
			var ret = a.nodeLabel.localeCompare(b.nodeLabel);
			if (ret === 0) {
				ret = a.graphName.localeCompare(b.graphName);
			}
			return ret;
		};

		var refreshFavorites = function() {
			//$log.debug('refreshing favorites');
			$scope.graphs = {};
			$scope.favoriteGraphs = [];
			return ResourceService.favorites().then(function(favs) {
				var favorite,
					graphPromises = [];

				favs.sort(sortFavorites);

				for (var i=0, len=favs.length; i < len; i++) {
					favorite = favs[i];
					graphPromises.push(ResourceService.graph(favorite.graphName));
				}

				return $q.all(graphPromises).then(function(gds) {
					var graphDefs = {}, def;
					for (var i=0, len=gds.length; i < len; i++) {
						def = gds[i];
						graphDefs[def.name] = def;
					}

					if ($scope.currentGraphSlide >= favs.length) {
						// "current" graph is now higher than the number of graphs we have
						$scope.currentGraphSlide = 0;
					}
					$scope.graphs = graphDefs;
					$scope.favoriteGraphs = favs;

					$timeout(function() {
						var delegate = $ionicSlideBoxDelegate.$getByHandle('graph-slide-box');
						delegate.slide($scope.currentGraphSlide);
						delegate.update();
					});
				});
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});
		};

		var resetFavorites = function() {
			$scope.graphs = [];
			$scope.favoriteGraphs = [];
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

		var resetAvailability = function() {
			$scope.availability = undefined;
		};

		var refreshOutages = function() {
			return OutageService.get().then(function(results) {
				var data = {}, outages = [], outage, service, total = 0;

				for (var i=0, len=results.length; i < len; i++) {
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
				resetOutages();
				return $q.reject(err);
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});

		};

		var resetOutages = function() {
			hideDonut('outages', true);
			outageDonut.setData([]);
			outageDonut.setTitle(0);
		};

		var refreshAlarms = function() {
			return AlarmService.severities().then(function(results) {
				var severities = [], severity, total = 0;

				for (var i=0, len=results.length; i < len; i++) {
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
				resetAlarms();
				return $q.reject(err);
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});

		};

		var resetAlarms = function() {
			hideDonut('alarms', true);
			alarmDonut.setData([]);
			alarmDonut.setTitle(0);
		};

		var refreshing = false;
		$scope.refreshData = debounce(500, function() {
			if (refreshing) {
				return;
			}
			refreshing = true;

			$log.info('DashboardCtrl.refreshData: refreshing data.');

			var finished = function(type) {
				util.hideSplashscreen();
				$timeout(function() {
					refreshing = false;
					$ionicLoading.hide();
					$scope.$broadcast('scroll.refreshComplete');
				}, 50);
			};

			Servers.getDefault().then(function(server) {
				if (server) {
					return $q.all([
						refreshAvailability(),
						refreshOutages(),
						refreshAlarms(),
						refreshFavorites(),
					]);
				} else {
					return $q.reject('No server configured.');
				}
			}).finally(function() {
				finished();
			});
		});

		$scope.resetData = function() {
			$log.debug('Resetting Data.');
			$scope.serverName = undefined;
			resetAvailability();
			resetOutages();
			resetAlarms();
			resetFavorites();
		};

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
				Servers.setDefault(server);
			};
		});

		$scope.util = util;
		$scope.modals = Modals;
		$scope.e = Errors;
		$scope.errors = [];
		$scope.currentDonutSlide = 0;
		$scope.currentGraphSlide = 0;
		$scope.landscape = true;
		Servers.getDefault().then(function(server) {
			$scope.serverName = server.name;
		});

		$scope.range = {
			end: new Date()
		};

		var defaultRange = $injector.get('default-graph-range');
		$scope.range.start = new Date($scope.range.end.getTime() - defaultRange);

		updateLogo();

		util.onDefaultServerUpdated(function(defaultServer) {
			if (defaultServer && angular.isDefined(defaultServer.name)) {
				$scope.serverName = defaultServer.name;
				$scope.refreshData();
			} else {
				$scope.resetData();
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

		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			/* // skip all this for now, getting weird rendering bug
			$log.debug('info=' + angular.toJson(info));
			if (info) {
				if (info.direction === 'back') {
					// don't refresh if we're going back
					return;
				}
				if (info.stateParams && info.stateParams.refresh === false) {
					// also don't refresh if we've been explicitly asked not to
					return;
				}
			}

			// otherwise, fall through to refreshing
			$log.debug("refreshing");
			*/
			$scope.refreshData();
		});
	});

}());
