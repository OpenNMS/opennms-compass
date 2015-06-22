(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.controllers.Settings', [
		'ionic',
		'opennms.services.Availability',
		'opennms.services.Errors',
		'opennms.services.IAP',
		'opennms.services.Info',
		'opennms.services.Settings',
		'opennms.services.Util',
	])
	.controller('SettingsCtrl', function($scope, $timeout, $window, $filter, $ionicPlatform, $ionicPopup, AvailabilityService, Errors, IAP, Info, Settings, util) {
		console.log('Settings initializing.');

		$scope.util = util;

		var init = function() {
			Settings.get().then(function(settings) {
				$scope.settings = settings;
			});
			Settings.getServerName().then(function(serverName) {
				$scope.serverName = serverName;
			});
			Settings.URL().then(function(url) {
				$scope.serverURL = url;
			});
			Settings.username().then(function(username) {
				$scope.username = username;
			});
			Settings.version().then(function(version) {
				$scope.version = version;
			});
			Settings.build().then(function(build) {
				$scope.build = build;
			});
			$scope.errors = Errors.get();
			$scope.info = Info.get();
			$scope.canSetLocation = Info.canSetLocation();
			AvailabilityService.supported().then(function(isSupported) {
				$scope.hasAvailability = isSupported;
				$scope.$broadcast('scroll.refreshComplete');
			});
			$scope.$broadcast('scroll.refreshComplete');
		};
		init();

		$scope.save = function() {
			Settings.set($scope.settings);
			if ($scope.hide) {
				$scope.hide();
			}
		};
		$scope.formatType = function(type) {
			if (type) {
				var chunks = type.split('-');
				var ret = "";
				for (var i=0; i < chunks.length; i++) {
					ret += chunks[i].capitalize();
					if ((i+1) !== chunks.length) {
						ret += " ";
					}
				}
				return ret;
			}
			return type;
		};

		$scope.getErrorMessage = function(error) {
			if (error.message && error.message.toString) {
				return error.message.toString();
			} else {
				return error.message;
			}
		};

		$scope.clearErrors = function() {
			Errors.reset();
		};

		$ionicPlatform.ready(function() {
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

		util.onProductUpdated(function() {
			$scope.products = IAP.get();
			$scope.$broadcast('scroll.refreshComplete');
		});
		util.onInfoUpdated(function() {
			$scope.info = Info.get();
			$scope.canSetLocation = Info.canSetLocation();
			$scope.$broadcast('scroll.refreshComplete');
		});
		util.onErrorsUpdated(function() {
			$scope.errors = Errors.get();
			$scope.$broadcast('scroll.refreshComplete');
		});
		util.onInfoUpdated(init);

		$scope.$on('$ionicView.beforeEnter', init);
	});

}());