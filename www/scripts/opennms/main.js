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
		'opennms.controllers.Alarms',
		'opennms.controllers.Dashboard',
		'opennms.controllers.Nodes',
		'opennms.controllers.Settings',
	])
	.config(['$stateProvider', '$urlRouterProvider', '$ionicConfigProvider', function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
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
	}])
	.run(['$rootScope', '$timeout', '$window', '$ionicPlatform', 'Ads', 'IAP', 'Info', 'Modals', 'Settings', function($rootScope, $timeout, $window, $ionicPlatform, Ads, IAP, Info, Modals, Settings) {
		var updateTheme = function() {
			Info.get().then(function(info) {
				if (info.packageName === 'meridian') {
					$rootScope.themeType = 'meridian';
				} else {
					$rootScope.themeType = 'horizon';
				}
			});
		};
		updateTheme();

		$rootScope.$on('opennms.settings.changed', function() {
			$timeout(updateTheme);
		});

		$ionicPlatform.ready(function() {
			console.log('Ionic is ready.');
			Ads.show();
			IAP.init();
			if (!Settings.isServerConfigured()) {
				Modals.settings();
			}
		});
	}]);
}());
