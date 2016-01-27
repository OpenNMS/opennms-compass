(function() {
	'use strict';

	var angular = require('angular'),
		AlarmFilter = require('../alarms/AlarmFilter'),
		$ = require('jquery');

	require('../alarms/AlarmService');
	require('../availability/AvailabilityService');
	require('../nodes/ResourceService');
	require('../outages/OutageService');
	require('../servers/Servers');
	require('../settings/SettingsService');

	require('../misc/Errors');
	require('../misc/Info');
	require('../misc/Modals');
	require('../misc/util');

	var dashboardTemplate = require('ngtemplate!html!./dashboard.html');
	var loadingTemplate = require('ngtemplate!html!../misc/loading.html');
	var serverPopoverTemplate = require('ngtemplate!html!./server-popover.html');

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

	angular.module('opennms.controllers.Dashboard', [
		'ionic',
		'angular-flot',
		'rt.debounce',
		'opennms.services.Alarms',
		'opennms.services.Availability',
		'opennms.services.Errors',
		'opennms.services.Info',
		'opennms.services.Modals',
		'opennms.services.Outages',
		'opennms.services.Resources',
		'opennms.services.Servers',
		'opennms.services.Settings', // for default-graph-min-range
		'opennms.services.Util'
	])
	.config(function($stateProvider) {
		$stateProvider
		.state('dashboard', {
			url: '/dashboard',
			params: {
				refresh: true
			},
			templateUrl: dashboardTemplate,
			controller: 'DashboardCtrl'
		});
	})
	.controller('DashboardCtrl', function($q, $rootScope, $scope, $injector, $interval, $log, $timeout, $state, $document, $window, $ionicLoading, $ionicPopup, $ionicPopover, $ionicSlideBoxDelegate, debounce, AlarmService, AvailabilityService, Errors, Info, Modals, OutageService, ResourceService, Servers, util) {
		$log.info('DashboardCtrl: Initializing.');

		$scope.donuts = {};

		var updateArrows = function(height) {
			var arrowOffset = Math.round(height * 0.5) - 50;

			var outageArrow = document.getElementById('outage-arrow');
			if (outageArrow) {
				outageArrow.style.top = arrowOffset + 'px';
			}

			var alarmArrow = document.getElementById('alarm-arrow');
			if (alarmArrow) {
				alarmArrow.style.top = arrowOffset + 'px';
			}
		};

		$scope.refreshDonutSlide = function(index) {
			$scope.currentDonutSlide = index;
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
				});
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
				$timeout(function() {
					var delegate = $ionicSlideBoxDelegate.$getByHandle('graph-slide-box');
					delegate.slide($scope.currentGraphSlide);
					delegate.update();
				});
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

		var labelFormatter = function(label, series) {
			//return "<div style='text-align:center; text-shadow: -1px -1px black, 1px -1px black, 1px 1px black, -1px 1px black; padding:2px; color:white;'>" + label + '<br/>' + series.data[0][1] + "</div>";
			return '<div class=\'labelContents\'><div class=\'labelText\'>' + label + '</div><div class=\'valueText\'>' + series.data[0][1] + '</div></div>';
		};

		var flotOptions = {
			canvas: true,
			grid: {
				borderWidth:0,
				labelMargin:0,
				axisMargin:0,
				minBorderMargin:0
			},
			yaxis: {
				ticks: 0,
				show: false
			},
			series: {
				pie: {
					show: true,
					radius: 0.9,
					innerRadius: 0.4,
					combine: {
						threshold: 0.05
					},
					stroke: {
						color: 'black',
						width: 1
					},
					label: {
						show: true,
						radius: 0.65,
						formatter: labelFormatter
					}
				}
			},
			legend: {
				show: false
			}
		};

		var updateTitles = function() {
			var updateTitle = function(type) {
				$log.debug('updateTitles(' + type + ')');
				var visible, hidden;
				if ($rootScope.wide) {
					//$log.debug('wide is enabled');
					visible = $('.wide .' + type + ' .donut-title');
					hidden = $('.portrait .' + type + ' .donut-title');
				} else {
					//$log.debug('wide is disabled');
					visible = $('.portrait .' + type + ' .donut-title');
					hidden = $('.wide .' + type + ' .donut-title');
				}

				//$log.debug('visible='+angular.toJson(visible));
				//$log.debug('hidden='+angular.toJson(hidden));
				if ($scope.donuts) {
					if ($scope.donuts[type]) {
						var total = $scope.donuts[type].total;
						//$log.debug(type + ' total: ' + total);
						if (total === undefined) {
							visible.hide();
							visible.text('');
						} else {
							var html = '<div class="row total"><div class="col">' + total + '</div></div>' +
								'<div class="row type"><div class="col">' + type + '</div></div>';
							visible.html(html);
							visible.show();
						}
					}
				}
			};

			updateTitle('outages');
			updateTitle('alarms');
		};

		var resetOutages = function() {
			hideDonut('outages', true);
			if ($scope.donuts && $scope.donuts.outages) {
				$scope.donuts.outages = {};
			}
			updateTitles();
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
							label: service,
							data: data[service]
						});
					}
				}
				outages.sort(function(a, b) {
					var ret = b.data - a.data;
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
				$scope.donuts.outages = {
					total: total,
					data: outages,
					options: angular.extend({}, flotOptions)
				};
				hideDonut('outages', false);
				updateTitles();
				return outages;
			}, function(err) {
				Errors.set('outage-chart', err);
				resetOutages();
				updateTitles();
				return $q.reject(err);
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});

		};

		var resetAlarms = function() {
			hideDonut('alarms', true);
			if ($scope.donuts && $scope.donuts.alarms) {
				$scope.donuts.alarms = {};
			}
			updateTitles();
		};

		var refreshAlarms = function() {
			return AlarmService.severities().then(function(results) {
				var severities = [], severity, total = 0;

				for (var i=0, len=results.length; i < len; i++) {
					severity = results[i];
					total += severity.count;
					severities.push({
						label: severity.severity.capitalize(),
						data: severity.count,
						color: util.color(severity.severity)
					});
				}

				Errors.clear('alarm-chart');
				$scope.donuts.alarms = {
					total: total,
					data: severities,
					options: angular.extend({}, flotOptions)
				};
				hideDonut('alarms', false);
				updateTitles();
				return severities;
			}, function(err) {
				Errors.set('alarm-chart', err);
				resetAlarms();
				updateTitles();
				return $q.reject(err);
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});

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
						refreshFavorites()
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
			$scope.serverName = null;
			resetAvailability();
			resetOutages();
			resetAlarms();
			resetFavorites();
		};

		$scope.unfavorite = function(favorite) {
			var graphTitle = $scope.graphs && $scope.graphs[favorite.graphName]? $scope.graphs[favorite.graphName].title : 'graph';
			return $ionicPopup.confirm({
				title: 'Remove Favorite',
				template: 'Remove ' + graphTitle + ' from favorites?',
				okType: 'button-compass'
			}).then(function(confirmed) {
				if (confirmed) {
					var favoriteIndex = $scope.favoriteGraphs.indexOf(favorite);
					if (favoriteIndex >= 0) {
						$scope.favoriteGraphs = [];
						$ionicSlideBoxDelegate.$getByHandle('graph-slide-box').update();
					}
					return ResourceService.unfavorite(favorite.resourceId, favorite.graphName).finally(function() {
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
			return $scope.currentGraphSlide >= index - 2 && $scope.currentGraphSlide <= index + 2;
		};

		$scope.goToDonutSlide = function(slide) {
			$ionicSlideBoxDelegate.$getByHandle('donut-slide-box').slide(slide);
		};

		$scope.showSelectServer = function($event) {
			return Servers.all().then(function(servers) {
				return $scope.serverPopover.then(function(popover) {
					popover.scope.servers = servers;
					return popover.show($event);
				});
			});
		};

		$scope.hideSelectServer = function() {
			return $scope.serverPopover.then(function(popover) {
				return popover.hide();
			});
		};

		$scope.serverPopover = $ionicPopover.fromTemplateUrl(serverPopoverTemplate, {
			scope: $scope
		}).then(function(popover) {
			popover.scope.selectServer = function(server) {
				$ionicLoading.show({templateUrl: loadingTemplate, duration: 5000});
				popover.hide();
				Servers.setDefault(server);
			};
			return popover;
		});

		$scope.util = util;
		$scope.modals = Modals;
		$scope.e = Errors;
		$scope.errors = [];
		$scope.currentDonutSlide = 0;
		$scope.currentGraphSlide = 0;
		Servers.getDefault().then(function(server) {
			$scope.serverName = server && server.name? server.name : null;
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

		$scope.$watchGroup(['width', 'height', 'wide'], function(dims) {
			var width  = dims[0],
				height = dims[1],
				wide   = dims[2],
				oldDonutSize = $scope.donutSize;
			if (wide) {
				$scope.donutSize = Math.round(Math.min(width, height) / 2.0);
				//$scope.donutSize = Math.round(width / 2.0);
			} else {
				$scope.donutSize = width;
			}

			$log.debug('Updated donuts: ' + oldDonutSize + ' -> ' + $scope.donutSize);
			updateArrows(height);
			updateTitles();
		});

		$scope.$on('$destroy', function() {
			$scope.serverPopover.then(function(popover) {
				popover.remove();
			}).finally(function() {
				delete $scope.serverPopover;
			});
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
