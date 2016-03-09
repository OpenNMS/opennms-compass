(function () {
	'use strict';

	/* global screen: true */

	/*
	require('style!css!../../bower_components/leaflet/dist/leaflet.css');
	require('../../scss/opennms.scss');
	require('../../bower_components/onmsicons/scss/onmsicons.scss');
	*/

	var angular = require('angular');

	require('ionic/release/js/ionic');
	require('ionic/release/js/ionic-angular');

	require('ngCordova');

	require('./misc/Array');
	require('./misc/String');

	require('./misc/Analytics');
	require('./misc/BuildConfig');
	require('./misc/Info');
	require('./misc/Ionic');
	require('./misc/Modals');

	require('./alarms/AlarmsController');
	require('./dashboard/DashboardController');
	require('./nodes/NodeController');
	require('./nodes/NodesController');
	require('./nodes/ResourceController');
	require('./nodes/ResourcesController');
	require('./settings/SettingsController');

	require('./servers/Servers');
	require('./misc/util');

	var templates = {
	};

	angular.module('opennms.Main', [
		'ionic',
		'ngCordova',
		'rt.debounce',
		'opennms.services.BuildConfig',
		'opennms.services.Analytics',
		'opennms.services.Info',
		/*'opennms.services.Ionic',*/
		'opennms.services.Modals',
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
	.config(['$compileProvider', '$logProvider', 'config.build.debug', function($compileProvider, $logProvider, isDebug) {
      /* eslint-disable no-console */
		isDebug = !!isDebug;
		console.log('debug mode: ' + isDebug);
		$compileProvider.debugInfoEnabled(isDebug);
		$logProvider.debugEnabled(isDebug);
      /* eslint-enable no-console */
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
		$ionicConfigProvider.backButton.previousTitleText(false);

		$cordovaInAppBrowserProvider.setDefaultOptions({
			location:'no',
			enableViewportScale:'yes',
			transitionstyle:'fliphorizontal',
			toolbarposition:'top'
		});
	})
	.run(function($rootScope, $http, $log, $templateCache, $timeout, $window, $ionicPlatform, $ionicPopup, debounce, Info, /*IonicService, */ Modals, Servers, util) {

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
