(function () {
	'use strict';

	/* global ionic: true */
	/* global cordova: true */
	/* global moment: true */
	/* global screen: true */
	/* global AdMob: true */

	angular.module('opennms.Main', [
		'ionic',
		'ngCordova',
		'rt.debounce',
		'opennms.services.BuildConfig',
		'opennms.services.Alarms',
		'opennms.services.Info',
		/*'opennms.services.Ionic',*/
		'opennms.services.Modals',
		'opennms.services.Outages',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util',
		'opennms.controllers.Alarms',
		'opennms.controllers.Dashboard',
		'opennms.controllers.Node',
		'opennms.controllers.NodeResource',
		'opennms.controllers.NodeResources',
		'opennms.controllers.Nodes',
		'opennms.controllers.Settings',
	])
	.config(['$compileProvider', '$logProvider', 'config.build.debug', function($compileProvider, $logProvider, isDebug) {
		isDebug = !!isDebug;
		console.log('debug mode: ' + isDebug);
		$compileProvider.debugInfoEnabled(isDebug);
		$logProvider.debugEnabled(isDebug);
	}])
	.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $cordovaInAppBrowserProvider) {
		$urlRouterProvider.otherwise('/dashboard');

		$cordovaInAppBrowserProvider.setDefaultOptions({
			location:'no',
			enableViewportScale:'yes',
			transitionstyle:'fliphorizontal',
			toolbarposition:'top'
		});

		$ionicConfigProvider.views.maxCache(20);
		$ionicConfigProvider.views.forwardCache(true);
		$ionicConfigProvider.views.swipeBackEnabled(false);
		$ionicConfigProvider.tabs.position('bottom');

		$stateProvider
		.state('dashboard', {
			url: '/dashboard',
			params: {
				refresh: true,
			},
			templateUrl: 'templates/dashboard.html',
			controller: 'DashboardCtrl',
		})
		.state('alarms', {
			url: '/alarms',
			templateUrl: 'templates/alarms.html',
			controller: 'AlarmsCtrl',
		})
		.state('nodes', {
			url: '/nodes',
			templateUrl: 'templates/nodes.html',
			controller: 'NodesCtrl',
		})
		.state('node-detail', {
			url: '/nodes/:node',
			templateUrl: 'templates/node-detail.html',
			controller: 'NodeCtrl',
		})
		.state('node-resources', {
			url: '/nodes/:node/resources',
			templateUrl: 'templates/node-resources.html',
			controller: 'NodeResourcesCtrl',
		})
		.state('node-resource', {
			url: '/nodes/:node/resource/:resource',
			templateUrl: 'templates/node-resource.html',
			controller: 'NodeResourceCtrl',
		})
		;

		$ionicConfigProvider.views.maxCache(20);
		$ionicConfigProvider.views.forwardCache(true);
		$ionicConfigProvider.views.swipeBackEnabled(false);
		$ionicConfigProvider.tabs.position('bottom');
		$ionicConfigProvider.backButton.previousTitleText(false);

		$cordovaInAppBrowserProvider.setDefaultOptions({
			location:'no',
			enableViewportScale:'yes',
			transitionstyle:'fliphorizontal',
			toolbarposition:'top'
		});
	})
	.run(function($rootScope, $http, $log, $templateCache, $timeout, $window, $ionicPlatform, $ionicPopup, debounce, Info, /*IonicService, */ Modals, Servers, Settings, util) {

		var calculateSizes = function() {
			$rootScope.width  = angular.element($window).width();
			$rootScope.height = angular.element($window).height();
			if ($rootScope.height === 0) {
				$rootScope.height = $rootScope.width;
			}
			if ($rootScope.width === 0) {
				$rootScope.width = $rootScope.height;
			}
			var minDim = Math.min($rootScope.width, $rootScope.height),
				maxDim = Math.max($rootScope.width, $rootScope.height);

			$rootScope.wide = (minDim / maxDim >= 0.7 && minDim >= 767); // tablet-sized

			$log.debug('main.handleResize complete: width=' + $rootScope.width + ', height=' + $rootScope.height + ', wide=' + $rootScope.wide);
		};
		var handleResize = debounce(100, calculateSizes);

		$rootScope.$on('resize', handleResize);
		$window.addEventListener('orientationchange', handleResize);
		calculateSizes();
		if (!$rootScope.wide) {
			$log.debug('Looks like we\'re on a phone-like device.  Locking orientation to portrait.');
			screen.lockOrientation('portrait');
		} else {
			$log.debug('Looks like we\'re on a tablet-like device.');
		}

		var templates = ['alarm-detail', 'alarm-filter', 'alarms', 'dashboard', 'edit-server', 'loading', 'menu',
			'node-detail', 'node-resource', 'node-resources', 'nodes', 'onms-graph', 'outages', 'server-popover', 'settings'];

		for (var t=0, len=templates.length; t < len; t++) {
			$log.debug('loading template: ' + templates[t]);
			$http.get('templates/' + templates[t] + '.html', {cache:$templateCache});
		}

		var updateTheme = function(info) {
			if (!info) {
				info = Info.get();
			}
			if (info.packageName === 'meridian') {
				$rootScope.themeType = 'meridian';
			} else {
				$rootScope.themeType = 'horizon';
			}
		};
		updateTheme();
		util.onInfoUpdated(updateTheme);

		Servers.getDefault().then(function(server) {
			$log.debug('main: default server: ' + (server? server.name : 'unknown'));
			if (server && server.name) {
				return true;
			} else {
				Modals.settings(true);
				return false;
			}
		}, function(err) {
			$log.error('Failed to get default server: ' + angular.toJson(err));
			return Modals.settings(true).then(function() {
				return false;
			});
		}).finally(function() {
			$timeout(function() {
				util.hideSplashscreen();
			}, 1000);
		});

		$log.info('Ionic is ready.');
	});
}());
