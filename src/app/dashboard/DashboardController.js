(function() {
	'use strict';

	var angular = require('angular'),
		AlarmFilter = require('../alarms/AlarmFilter'),
		$ = require('jquery');

	require('angular-cache');
	require('angular-debounce');

	require('./Service');
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

	var dashboardTemplate = require('ngtemplate!./dashboard.html');
	var loadingTemplate = require('ngtemplate!../misc/loading.html');
	var serverPopoverTemplate = require('ngtemplate!./server-popover.html');

	var favoriteGraphsTemplate = require('ngtemplate!./dashboard-favorite-graphs.html');
	var availabilityTemplate = require('ngtemplate!./dashboard-availability.html');

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
		'angular-cache',
		'angular-flot',
		'rt.debounce',
		'opennms.dashboard.Service',
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
	.config(function($stateProvider, CacheFactoryProvider) {
		$stateProvider
		.state('dashboard', {
			url: '/dashboard',
			params: {
				refresh: true
			},
			templateUrl: dashboardTemplate,
			controller: 'DashboardCtrl'
		});
		angular.extend(CacheFactoryProvider.defaults, {
			maxAge: 10 * 60 * 1000
		});
	})
	.controller('DashboardCtrl', function($q, $rootScope, $scope, $injector, $interval, $log, $timeout, $state, $document, $window, $ionicLoading, $ionicPopup, $ionicPopover, $ionicSlideBoxDelegate, AlarmService, AvailabilityService, CacheFactory, DashboardService, debounce, Errors, Info, Modals, OutageService, ResourceService, Servers, util) {
		$log.info('DashboardCtrl: Initializing.');

		$scope.favoriteGraphsTemplate = favoriteGraphsTemplate;
		$scope.availabilityTemplate = availabilityTemplate;

		$scope.donuts = {};
		if (!CacheFactory.get('dashboardCache')) {
			CacheFactory.createCache('dashboardCache');
		}
		var dashboardCache = CacheFactory.get('dashboardCache');

		$scope.refreshDonutSlide = function(index) {
			$scope.currentDonutSlide = index;
		};

		$scope.donutVisible = function(type) {
			return $scope.donutSize && $scope.donutSize > 0 && !Errors.hasError(type+'-chart') && $scope.donuts && $scope.donuts[type] && $scope.donuts[type].data && $scope.donuts[type].options && $scope.donuts[type].options.series;
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

		var updateTitles = debounce(500, function() {
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
				$scope.$broadcast('scroll.refreshComplete');
			};

			updateTitle('outages');
			updateTitle('alarms');
		});

		var resetOutages = function() {
			hideDonut('outages', true);
			if ($scope.donuts && $scope.donuts.outages) {
				$scope.donuts.outages = {};
			}
			updateTitles();
		};

		$scope.$on('opennms.dashboard.update.outages', function(ev, update) {
			$log.debug('Dashboard Update Outages: ' + (update.success? 'Success':'Failure'));

			if (update.success) {
				$scope.donuts.outages = update.contents;
				$scope.donuts.outages.options = angular.copy(flotOptions);
				if ($scope.donuts.outages.total === 0) {
					$scope.donuts.outages.options.series.pie.label.show = false;
				}
				hideDonut('outages', false);
				updateTitles();
			} else {
				resetOutages();
			}
		});


		var resetAlarms = function() {
			hideDonut('alarms', true);
			if ($scope.donuts && $scope.donuts.alarms) {
				$scope.donuts.alarms = {};
			}
			updateTitles();
		};

		$scope.$on('opennms.dashboard.update.alarms', function(ev, update) {
			$log.debug('Dashboard Update Alarms: ' + (update.success? 'Success':'Failure'));

			if (update.success) {
				$scope.donuts.alarms = update.contents;
				$scope.donuts.alarms.options = angular.copy(flotOptions);
				if ($scope.donuts.alarms.total === 0) {
					$scope.donuts.alarms.options.series.pie.label.show = false;
				}
				hideDonut('alarms', false);
				updateTitles();
			} else {
				resetAlarms();
			}
		});

		var resetAvailability = function() {
			$scope.availability = undefined;
		};

		$scope.$on('opennms.dashboard.update.availability', function(ev, update) {
			$log.debug('Dashboard Update Alarms: ' + (update.success? 'Success':'Failure'));

			if (update.success) {
				$scope.availability = update.contents;
			} else {
				resetAvailability();
			}
		});

		var resetFavorites = function() {
			$scope.graphs = [];
			$scope.favoriteGraphs = [];
			$scope.$broadcast('scroll.refreshComplete');
		};

		$scope.$on('opennms.dashboard.update.favorites', function(ev, update) {
			$log.debug('Dashboard Update Favorites: ' + (update.success? 'Success':'Failure'));

			if (update.success) {
				if ($scope.currentGraphSlide >= update.contents.favorites.length) {
					// "current" graph is now higher than the number of graphs we have
					$scope.currentGraphSlide = 0;
				}
				$scope.graphs = update.contents.graphDefs;
				$scope.favoriteGraphs = update.contents.favorites;
				$scope.$broadcast('scroll.refreshComplete');
			} else {
				resetFavorites();
			}
			$timeout(function() {
				var delegate = $ionicSlideBoxDelegate.$getByHandle('graph-slide-box');
				delegate.slide($scope.currentGraphSlide);
				delegate.update();
			});
		});


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

			$q.when($scope.server).then(function(server) {
				if (server) {
					return $q.all([
						DashboardService.refreshAvailability(),
						DashboardService.refreshOutages(),
						DashboardService.refreshAlarms(),
						DashboardService.refreshFavorites()
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
			$scope.server = null;
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
						return DashboardService.refreshFavorites();
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
				popover.hide();
				$scope.resetData();
				updateTitles();
				updateTitles.flush();
				$scope.server = server;
				$ionicLoading.show({templateUrl: loadingTemplate, duration: 20000});
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
			$scope.server = server || null;
		});

		$scope.range = {
			end: new Date()
		};

		var defaultRange = $injector.get('default-graph-range');
		$scope.range.start = new Date($scope.range.end.getTime() - defaultRange);

		updateLogo();

		util.onDefaultServerUpdated(function(defaultServer) {
			//$log.debug('DashboardController.onDefaultServerUpdated: ' + angular.toJson(defaultServer));
			if (defaultServer && angular.isDefined(defaultServer.name)) {
				dashboardCache.put('defaultServer', defaultServer);
				$scope.server = defaultServer;
				$scope.refreshData();
			} else {
				dashboardCache.remove('defaultServer');
				$scope.server = null;
				$scope.resetData();
			}
		});

		util.onDirty('alarms', DashboardService.refreshAlarms);
		util.onDirty('outages', DashboardService.refreshOutages);
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
			} else {
				$scope.donutSize = width;
			}

			if (oldDonutSize !== $scope.donutSize) {
				$log.debug('Updated donuts: ' + oldDonutSize + ' -> ' + $scope.donutSize);
				updateTitles();
			}
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
