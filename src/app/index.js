import 'onmsicons/fonts/onmsicons.eot';
import 'onmsicons/fonts/onmsicons.svg';
import 'onmsicons/fonts/onmsicons.ttf';
import 'onmsicons/fonts/onmsicons.woff';

import 'ionic-angular/release/js/ionic';
import 'ionic-angular/release/js/ionic-angular';
import 'ngCordova';

import '../../generated/misc/BuildConfig';
import './misc/Array';
import './misc/String';

(function () {
	'use strict';

	if (ionic.Platform.isAndroid()) {
		ionic.Platform.ready(function() {
			if (!cordova && !cordova.plugins && !cordova.plugins.diagnostic) {
				console.log('Android is missing cordova.plugins.diagnostic!!'); // eslint-disable-line no-console
			}
			cordova.plugins.diagnostic.requestRuntimePermissions(function(statuses) {
			}, function(error) {
				console.error('An error occurred requesting permissions: ' + error); // eslint-disable-line no-console
			},[
				cordova.plugins.diagnostic.permission.ACCESS_COARSE_LOCATION,
				cordova.plugins.diagnostic.permission.ACCESS_FINE_LOCATION,
				cordova.plugins.diagnostic.permission.ACCESS_NETWORK_STATE,
				cordova.plugins.diagnostic.permission.ACCESS_WIFI_STATE,
				cordova.plugins.diagnostic.permission.INTERNET,
				cordova.plugins.diagnostic.permission.WRITE_EXTERNAL_STORAGE
			]);
		});
	}

	const Constants = require('./misc/Constants');

	require('./misc/Analytics');
	require('./misc/Info');
	/*require('./misc/Ionic');*/
	require('./misc/Modals');

	require('./alarms/AlarmsController');
	require('./dashboard/DashboardController');
	require('./nodes/NodeController');
	require('./nodes/NodesController');
	require('./nodes/ResourceController');
	require('./nodes/ResourcesController');
	require('./notifications/NotificationService');
	require('./settings/SettingsController');

	require('./servers/Servers');
	require('./misc/util');

	const RESIZE_DELAY = 100;
	const READY_DELAY = 1000;

	angular.module('opennms.Main', [
		'ionic',
		'ngCordova',
		'rt.debounce',
		'opennms.services.BuildConfig',
		'opennms.services.Analytics',
		'opennms.services.Info',
		/*'opennms.services.Ionic',*/
		'opennms.services.Modals',
		'opennms.services.Notifications',
		'opennms.services.Outages',
		'opennms.services.Servers',
		'opennms.services.Util',
		'opennms.controllers.Alarms',
		'opennms.controllers.Dashboard',
		'opennms.controllers.Node',
		'opennms.controllers.NodeResource',
		'opennms.controllers.NodeResources',
		'opennms.controllers.Nodes',
		'opennms.controllers.Settings'
	])
	.constant('config.build.debug', __DEVELOPMENT__)
	.config(['$compileProvider', '$logProvider', 'config.build.debug', function($compileProvider, $logProvider, isDebug) {
      /* eslint-disable no-console */
		console.log('debug mode: ' + isDebug);
		$compileProvider.debugInfoEnabled(isDebug);
		$logProvider.debugEnabled(isDebug);
      /* eslint-enable no-console */
	}])
	.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
		$urlRouterProvider.otherwise('/dashboard');
		$ionicConfigProvider.views.maxCache(Constants.MAX_CACHED_VIEWS);
		$ionicConfigProvider.views.forwardCache(true);
		$ionicConfigProvider.views.swipeBackEnabled(false);
		$ionicConfigProvider.tabs.position('bottom');
		$ionicConfigProvider.backButton.previousTitleText(false);
	})
	.run(function($rootScope, $http, $log, $timeout, $window, $ionicPlatform, $ionicPopup, debounce, Info, /*IonicService, */ Modals, NotificationService, Servers, util) {
		console.debug('Main: initializing');
		/* eslint-disable no-magic-numbers */
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

			$rootScope.wide = minDim / maxDim >= 0.7 && minDim >= 767; // tablet-sized

			$log.debug('main.handleResize complete: width=' + $rootScope.width + ', height=' + $rootScope.height + ', wide=' + $rootScope.wide);
		};
		/* eslint-enable no-magic-numbers */

		var handleResize = debounce(RESIZE_DELAY, calculateSizes);

		$window.addEventListener('orientationchange', handleResize);
		$window.addEventListener('orientation', handleResize);
		$window.addEventListener('resize', handleResize);
		calculateSizes();
		if (!$rootScope.wide && screen && screen.lockOrientation) {
			$log.debug('Looks like we\'re on a phone-like device.  Locking orientation to portrait.');
			screen.lockOrientation('portrait');
		} else {
			$log.debug('Looks like we\'re on a tablet-like device.');
		}

		var updateTheme = function(_info) {
			var info = _info? _info : Info.get();
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
			}

			Modals.settings(true);
			return false;
		}).catch(function(err) {
			$log.error('Failed to get default server: ' + angular.toJson(err));
			return Modals.settings(true).then(function() {
				return false;
			});
		}).finally(function() {
			$timeout(function() {
				util.hideSplashscreen();
				$rootScope.$broadcast('opennms.ready');
			}, READY_DELAY);
		});

		$log.info('Ionic is ready.');
	});
}());
