(function() {
	'use strict';

	var angular = require('angular'),
		AlarmFilter = require('../alarms/models/AlarmFilter'),
		$ = require('jquery');

	var Server = require('../servers/models/Server');
	var Constants = require('../misc/Constants');

	var initialLoad = true;

	require('angular-debounce');

	require('./Service');
	require('../alarms/AlarmService');
	require('../availability/Service');
	require('../nodes/ResourceService');
	require('../outages/OutageService');
	require('../servers/Servers');
	require('../settings/SettingsService');

	require('../misc/Cache');
	require('../misc/Capabilities');
	require('../misc/Errors');
	require('../misc/Info');
	require('../misc/Modals');
	require('../misc/OnmsGraph');
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

	var SHORT_DELAY = 50,
		REFRESH_DELAY = 500,
		LONG_REFRESH_DELAY = 5000;

	var sortAlarmData = function(a, b) {
		return severityOrder.indexOf(b.label.toUpperCase()) - severityOrder.indexOf(a.label.toUpperCase());
	};

	angular.module('opennms.controllers.Dashboard', [
		'ionic',
		'angular-flot',
		'rt.debounce',
		'opennms.dashboard.Service',
		'opennms.misc.Cache',
		'opennms.misc.OnmsGraph',
		'opennms.services.Alarms',
		'opennms.services.Availability',
		'opennms.services.Capabilities',
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
	.controller('DashboardCtrl', function($document, $injector, $interval, $ionicLoading, $ionicPopup, $ionicPopover, $ionicSlideBoxDelegate, $ionicViewSwitcher, $log, $q, $rootScope, $scope, $state, $timeout, $window, AlarmService, AvailabilityService, Cache, Capabilities, DashboardService, debounce, Errors, Info, Modals, OutageService, ResourceService, Servers, util) {
		$log.info('DashboardCtrl: Initializing.');

		$scope.favoriteGraphsTemplate = favoriteGraphsTemplate;
		$scope.availabilityTemplate = availabilityTemplate;

		$scope.donuts = {};

		$scope.supportsGraphs = Capabilities.graphs();
		util.onInfoUpdated(function() {
			$scope.supportsGraphs = Capabilities.graphs();
		});

		$scope.goToAlarms = function() {
			$ionicViewSwitcher.nextDirection('back');
			$state.go('alarms');
		};

		$scope.refreshDonutSlide = function(index) {
			$scope.currentDonutSlide = index;
		};

		$scope.donutVisible = function(type) {
			if (Errors.hasError('dashboard-'+type)) {
				return false;
			}
			return $scope.donutSize && $scope.donutSize > 0 && $scope.donuts && $scope.donuts[type] && $scope.donuts[type].data && $scope.donuts[type].options && $scope.donuts[type].options.series; // eslint-disable-line no-magic-numbers
		};

		var shouldHideDonut = {
			alarms: true,
			outages: true
		};

		var hideDonut = function(type, value) {
			if (value === true) {
				shouldHideDonut[type] = true;
			} else {
				$timeout(function() {
					shouldHideDonut[type] = false;
				}, SHORT_DELAY);
			}
		};

		$scope.donutClass = function(type) {
			if (shouldHideDonut[type]) {
				return 'invisible';
			}

			return '';
		};

		var updateLogo = function(_info) {
			var info = _info? _info : Info.get();
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

		var updateDonuts = debounce(REFRESH_DELAY, function() {
			var updateTitle = function(type) {
				$log.debug('updateDonuts(' + type + ')');
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

				$('.donut-overlay').height($scope.donutSize);
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
			updateDonuts();
		};

		$scope.$on('opennms.dashboard.update.outages', function(ev, update) {
			$log.debug('Dashboard Update Outages: ' + (update.success? 'Success':'Failure'));

			if (update.success) {
				$scope.donuts.outages = update.contents;
				$scope.donuts.outages.options = angular.copy(flotOptions);
				if ($scope.donuts.outages.total === 0) { // eslint-disable-line no-magic-numbers
					$scope.donuts.outages.options.series.pie.label.show = false;
				}
				hideDonut('outages', false);
				updateDonuts();
			} else {
				resetOutages();
			}
		});


		var resetAlarms = function() {
			hideDonut('alarms', true);
			if ($scope.donuts && $scope.donuts.alarms) {
				$scope.donuts.alarms = {};
			}
			updateDonuts();
		};

		$scope.$on('opennms.dashboard.update.alarms', function(ev, update) {
			$log.debug('Dashboard Update Alarms: ' + (update.success? 'Success':'Failure'));

			if (update.success) {
				$scope.donuts.alarms = update.contents;
				$scope.donuts.alarms.options = angular.copy(flotOptions);
				if ($scope.donuts.alarms.total === 0) { // eslint-disable-line no-magic-numbers
					$scope.donuts.alarms.options.series.pie.label.show = false;
				}
				hideDonut('alarms', false);
				updateDonuts();
			} else {
				resetAlarms();
			}
		});

		var resetAvailability = function() {
			$scope.availability = undefined;
		};

		$scope.$on('opennms.dashboard.update.availability', function(ev, update) {
			$log.debug('Dashboard Update Availability: ' + (update.success? 'Success':'Failure'));

			if (update.success) {
				$scope.availability = update.contents;
				for (var i=0, len=$scope.availability.length, section; i < len; i++) {
					section = $scope.availability[i];
					for (var c=0, clen=section.categories.length, category; c < clen; c++) {
						category = section.categories[c];
						if (category.outageText.contains('Calculating')) {
							$log.debug('Availability is still calculating... refreshing in 5 seconds.');
							$timeout(function() {
								DashboardService.refreshAvailability();
							}, LONG_REFRESH_DELAY);
							return;
						}
					}
				}
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
			if ($scope.favoriteGraphs.length > 0) { // eslint-disable-line no-magic-numbers
				$timeout(function() {
					var delegate = $ionicSlideBoxDelegate.$getByHandle('graph-slide-box');
					delegate.slide($scope.currentGraphSlide);
					delegate.update();
				}, SHORT_DELAY);
			}
		});


		var refreshing = false;
		$scope.refreshData = debounce(REFRESH_DELAY, function() {
			if (refreshing) {
				return;
			}
			if (!$scope.visible) {
				$log.warn('DashboardController.refreshData(): view is not currently visible, skipping refresh.');
				return;
			}
			refreshing = true;

			$log.info('DashboardCtrl.refreshData: refreshing data.');

			var finished = function(type) {
				$log.info('DashboardCtrl.refreshData: finished refreshing.');
				util.hideSplashscreen();
				refreshing = false;
				$timeout(function() {
					$ionicLoading.hide();
					$scope.$broadcast('scroll.refreshComplete');
				}, SHORT_DELAY);
			};

			$q.when($scope.server).then(function(server) {
				if (!server) {
					return $q.reject('No server configured.');
				}

				return $q.all([
					DashboardService.refreshAvailability(),
					DashboardService.refreshOutages(),
					DashboardService.refreshAlarms(),
					DashboardService.refreshFavorites()
				]);
			}).finally(function() {
				finished();
			});
		});

		function resetData() {
			$log.debug('DashboardCtrl.resetData()');
			//$scope.server = null;
			resetAvailability();
			resetOutages();
			resetAlarms();
			resetFavorites();
		}

		$scope.unfavorite = function(favorite) {
			var graphTitle = $scope.graphs && $scope.graphs[favorite.graphName]? $scope.graphs[favorite.graphName].title : 'graph';
			return $ionicPopup.confirm({
				title: 'Remove Favorite',
				template: 'Remove ' + graphTitle + ' from favorites?',
				okType: 'button-compass'
			}).then(function(confirmed) {
				if (!confirmed) {
					return $q.reject('Canceled favorite removal.');
				}

				var favoriteIndex = $scope.favoriteGraphs.indexOf(favorite);
				if (favoriteIndex >= 0) { // eslint-disable-line no-magic-numbers
					$scope.favoriteGraphs = [];
					$ionicSlideBoxDelegate.$getByHandle('graph-slide-box').update();
				}
				return ResourceService.unfavorite(favorite.resourceId, favorite.graphName).finally(function() {
					return DashboardService.refreshFavorites();
				});
			});
		};

		$scope.refreshGraphSlide = function(index) {
			if (index !== $scope.currentGraphSlide) {
				$scope.currentGraphSlide = index;
				$rootScope.$broadcast('opennms.refreshGraphs');
			}
		};

		$scope.shouldRenderGraph = function(index) {
			//return $scope.currentGraphSlide === index;
			return $scope.currentGraphSlide >= index - 2 && $scope.currentGraphSlide <= index + 2; // eslint-disable-line no-magic-numbers
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
				if ($scope.server && $scope.server._id !== server._id) {
					resetData();
					updateDonuts();
					updateDonuts.flush();
					//$scope.server = server;
					//$ionicLoading.show({templateUrl: loadingTemplate, duration: 20000}); // eslint-disable-line no-magic-numbers
					Servers.setDefault(server);
				}
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
			if (defaultServer && defaultServer.equals($scope.server)) {
				$scope.server.name = defaultServer.name;
				$log.debug('DashboardController.defaultServerUpdated: server is unchanged.');
				return;
			}

			if (defaultServer && angular.isDefined(defaultServer.name)) {
				Cache.set('dashboard-default-server', defaultServer);
				$scope.server = new Server(defaultServer);
				$scope.refreshData();
			} else {
				Cache.remove('dashboard-default-server');
				$scope.server = null;
				resetData();
			}
		});

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
				$scope.donutSize = Math.round(Math.min(width, height) / 2.0); // eslint-disable-line no-magic-numbers
			} else {
				$scope.donutSize = width;
			}

			if (oldDonutSize !== $scope.donutSize) {
				$log.debug('Updated donuts: ' + oldDonutSize + ' -> ' + $scope.donutSize);
				updateDonuts();
			}
		});

		$scope.$on('opennms.ready', $scope.refreshData);
		$scope.$on('$destroy', function() {
			$scope.serverPopover.then(function(popover) {
				popover.remove();
			}).finally(function() {
				delete $scope.serverPopover;
			});
			document.removeEventListener('resume', $scope.refreshData, false);
		});

		document.addEventListener('resume', $scope.refreshData, false);

		util.onLowMemory('dashboard', function(currentView) {
			$log.debug('DashboardCtrl: resetting data because of low memory.');
			resetData();
		});

		var lazyReset;
		$scope.$on('$ionicView.beforeEnter', function(ev, info) {
			$scope.visible = true;
			$timeout.cancel(lazyReset);
			$scope.refreshData();
			if (initialLoad) {
				initialLoad = false;
				$timeout(DashboardService.refreshFavorites, LONG_REFRESH_DELAY);
			}
		});
		$scope.$on('$ionicView.afterLeave', function(ev) {
			$scope.visible = false;
			lazyReset = $timeout(function() {
				$log.debug('DashboardController: view is stale, resetting data.');
				resetData();
			}, Constants.DEFAULT_TIMEOUT);
		});
	});

}());
