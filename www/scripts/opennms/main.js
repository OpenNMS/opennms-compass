(function () {
	'use strict';

	/* global ionic: true */
	/* global cordova: true */
	/* global moment: true */
	/* global AdMob: true */

	angular.module('opennms.Main', [
		'ionic',
		'ionic.service.deploy',
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
	.run(function($rootScope, $timeout, $window, $ionicDeploy, $ionicPlatform, $ionicPopup, Ads, IAP, Info, Modals, Settings) {
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

		var init = function() {
			console.log('Ionic is ready.');
			Ads.show();
			IAP.init();
			if (!Settings.isServerConfigured()) {
				Modals.settings();
			}
		};

		$ionicPlatform.ready(function() {
			$ionicDeploy.check().then(function(hasUpdate) {
				if (hasUpdate) {
					$ionicPopup.confirm({
						title: 'Update Available',
						subTitle: 'An update to OpenNMS Compass is available.  Upgrade now?',
						okText: 'Yes',
						okType: 'button-compass',
						cancelText: 'Not Now',
					}).then(function(result) {
						if (result) {
							$ionicDeploy.update();
						} else {
							init();
						}
					});
				} else {
					init();
				}
			}, function(err) {
				console.log('Warning: an error occurred while checking for updates: ' + angular.toJson(err));
				init();
			});
		});
	});
}());
