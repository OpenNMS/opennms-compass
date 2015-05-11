(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.controllers.Settings', [
		'ionic',
		'opennms.services.IAP',
		'opennms.services.Settings',
		'opennms.services.Util',
	])
	.controller('SettingsCtrl', ['$scope', '$timeout', '$window', '$filter', '$ionicPopup', 'IAP', 'Settings', 'util', function($scope, $timeout, $window, $filter, $ionicPopup, IAP, Settings, util) {
		console.log('Settings initializing.');

		$scope.util = util;
		$scope.settings = Settings.get();
		$scope.save = function() {
			Settings.set($scope.settings);
			if ($scope.hide) {
				$scope.hide();
			}
		};

		$scope.$on('opennms.product.updated', function(p) {
			$scope.$evalAsync(function() {
				$scope.products = IAP.get();
				//console.log('products list updated: ' + angular.toJson($scope.products, true));
			});
		});

		ionic.Platform.ready(function() {
			$scope.$evalAsync(function() {
				$scope.products = IAP.get();

				if ($window.cordova) {
					$scope.isCordova = true;
				} else {
					$scope.isCordova = false;
				}
				$scope.isIOS = ionic.Platform.isIOS();

				if ($window.appAvailability) {
					console.log('SettingsCtrl: checking for availability of onms://');
					$window.appAvailability.check('onms://',
						function() {
							console.log('SettingsCtrl: OpenNMS is available!');
							$scope.$evalAsync(function() {
								$scope.hasOpenNMS = true;
							});
						}, function() {
							console.log('SettingsCtrl: OpenNMS is not available.  :(');
							$scope.$evalAsync(function() {
								$scope.hasOpenNMS = false;
							});
						}
					);
				} else {
					console.log('SettingsCtrl: Cannot check app availability.');
				}

				console.log('SettingsCtrl: isCordova: ' + $scope.isCordova);
				console.log('SettingsCtrl: isIOS:     ' + $scope.isIOS);
			});
		});

		$scope.getRefreshInterval = function() {
			return Math.round(parseInt($scope.settings.refreshInterval, 10)/1000);
		};

		$scope.removeAds = function(alias) {
			IAP.purchase(alias).then(function() {
				console.log('SettingsCtrl.removeAds: purchase successfully initiated.');
			}, function(err) {
				$ionicPopup.alert({
					title: 'Ad Removal Failed',
					template: '<p>ERROR ' + err.code + ': Failed to remove ads: ' + err.message + '</p>',
					okType: 'button-assertive',
				});
			});
		};

		$scope.restorePurchases = function() {
			IAP.refresh().then(function() {
				$scope.products = IAP.get();
			});
		};

		var hasPurchased = function() {
			if ($scope.products && Object.keys($scope.products).length > 0) {
				if ($scope.products.disable_ads && $scope.products.disable_ads.owned) {
					return true;
				} else if ($scope.products.disable_ads_free && $scope.products.disable_ads_free.owned) {
					return true;
				}
			}
			return false;
		};

		$scope.disabled = function(alias) {
			if (hasPurchased()) {
				return true;
			} else if (alias === 'disable_ads_free' && !$scope.hasOpenNMS) {
				return true;
			}
			return false;
		};

		$scope.showUpgrade = function() {
			if ($scope.isCordova && $scope.isIOS) {
				if ($scope.products.disable_ads_free) {
					return true;
				}
			}
			return false;
		};

		$scope.handleKey = function(ev) {
			if (ev.which === 13) {
				util.hideKeyboard();
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		$scope.$on('$ionicView.beforeEnter', function() {
			$scope.settings = Settings.get();
		});
	}]);

}());