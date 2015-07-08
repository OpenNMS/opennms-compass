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
		'opennms.services.Ionic',
		'opennms.services.Modals',
		'opennms.services.Outages',
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
	.run(function($rootScope, $timeout, $window, $ionicPlatform, $ionicPopup, Ads, IAP, Info, IonicService, Modals, Settings, util) {
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

		var init = function() {
			console.log('Ionic is ready.');
			IAP.init().then(Ads.init);
		};

		IonicService.promptForUpdates().then(function(res) {
			if (res) {
				IonicService.update().then(undefined, function(err) {
					$ionicPopup.alert({
						title: 'Update failed.',
						template: angular.toJson(err),
						okType: 'button-compass',
					});
					init();
				});
			} else {
				init();
			}
		});

		Settings.isServerConfigured().then(function(isConfigured) {
			if (!isConfigured) {
				Modals.settings();
			}
		});
	});
}());
