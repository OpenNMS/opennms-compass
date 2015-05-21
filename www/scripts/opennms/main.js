(function () {
	'use strict';

	/* global ionic: true */
	/* global cordova: true */
	/* global moment: true */
	/* global AdMob: true */

	angular.module('opennms.Main', [
		'ionic',
		'ngCordova',
		'opennms.services.Ads',
		'opennms.services.BuildConfig',
		'opennms.services.Alarms',
		'opennms.services.IAP',
		'opennms.services.Info',
		'opennms.services.Modals',
		'opennms.services.Outages',
		'opennms.services.Settings',
		'opennms.services.Util',
		'opennms.controllers.Alarms',
		'opennms.controllers.Dashboard',
		'opennms.controllers.Nodes',
		'opennms.controllers.Settings',
	])
	.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $cordovaInAppBrowserProvider) {
		$urlRouterProvider.otherwise('/dashboard');

		$stateProvider
		.state('dashboard', {
			url: '/dashboard',
			templateUrl: 'templates/dashboard.html',
			controller: 'DashboardCtrl'
		})
		.state('alarms', {
			url: '/alarms',
			templateUrl: 'templates/alarms.html',
			controller: 'AlarmsCtrl'
		})
		.state('nodes', {
			url: '/nodes',
			templateUrl: 'templates/nodes.html',
			controller: 'NodesCtrl'
		})
		;

		$ionicConfigProvider.views.maxCache(20);
		$ionicConfigProvider.views.forwardCache(true);
		$ionicConfigProvider.views.swipeBackEnabled(false);
		$ionicConfigProvider.tabs.position('bottom');

		$cordovaInAppBrowserProvider.setDefaultOptions({
			location:'no',
			enableViewportScale:'yes',
			transitionstyle:'fliphorizontal',
			toolbarposition:'top'
		});
	})
	.run(function($rootScope, $timeout, $window, $ionicPlatform, Ads, IAP, Info, Modals, Settings, util) {
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

		$ionicPlatform.ready(function() {
			console.log('Ionic is ready.');
			Ads.show();
			IAP.init();
			if (!Settings.isServerConfigured()) {
				Modals.settings();
			}
		});
	});
}());
