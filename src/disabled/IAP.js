'use strict';

var angular = require('angular');

var ITUNES_CONNECT_ERROR_CODE = 6777010,
	HIDE_IAP_LOADING_TIMEOUT = 10000;

require('../app/servers/Servers');

require('../app/misc/Analytics');
require('../app/misc/Errors');
require('../app/misc/Info');
require('../app/misc/util');

angular.module('opennms.services.IAP', [
	'ionic',
	'opennms.services.Analytics',
	'opennms.services.Errors',
	'opennms.services.Info',
	'opennms.services.Servers',
	'opennms.services.Settings',
	'opennms.services.Util'
])
.factory('IAP', function($q, $rootScope, $log, $timeout, $window, $ionicLoading, $ionicPopup, Errors, Info, Servers, Settings, util) {
	var $scope = $rootScope.$new();
	$scope.products = {};

	$log.info('IAP: Initializing.');


	function init() {
		var deferred = $q.defer();
		var rejected = false;
		if ($window.store) {
			$window.store.verbosity = $window.store.INFO;
			$window.store.error(function(err) {
				$scope.$evalAsync(function() {
					var visibleMessage;

					switch(err.code) {
						case $window.store.ERR_PURCHASE:
							visibleMessage = 'An error occurred while attempting to purchase.'; break;
						case $window.store.ERR_PAYMENT_INVALID:
							visibleMessage = 'Invalid payment attempt.'; break;
						case $window.store.ERR_PAYMENT_NOT_ALLOWED:
							visibleMessage = 'Payment not allowed.'; break;
						case $window.store.ERR_UNKNOWN:
							visibleMessage = 'An unknown error occurred.'; break;
						case $window.store.ERR_FINISH:
							visibleMessage = 'An error occurred while completing your purchase.'; break;
						case $window.store.ERR_COMMUNICATION:
							visibleMessage = 'An error occurred while communicating with the store.'; break;
						case $window.store.ERR_VERIFICATION_FAILED:
							visibleMessage = 'An error occurred while validating store data.'; break;
						case $window.store.ERR_BAD_RESPONSE:
							visibleMessage = 'The store returned an invalid or unknown response.'; break;
						case $window.store.ERR_PAYMENT_EXPIRED:
							visibleMessage = 'Your payment method has expired.'; break;
						case $window.store.ERR_REFRESH:
							visibleMessage = 'An error occurred while attempting to restore purchases.'; break;
						default:
							visibleMessage = 'An unknown error occurred while attempting to purchase.'; break;
					}

					if (err.code === ITUNES_CONNECT_ERROR_CODE && err.message === 'Cannot connect to iTunes Store') {
						visibleMessage = 'Cannot connect to iTunes Store';
					}

					if (!rejected) {
						rejected = true;
						deferred.reject(err);
					}
					$log.error('IAP: ERROR ' + err.code + ': ' + err.message);
					$rootScope.$broadcast('opennms.product.error', err);
					if (visibleMessage) {
						Errors.set('store', err.code + ': ' + visibleMessage);
						$ionicLoading.hide();
						$ionicPopup.alert({
							title: 'Error ' + err.code,
							template: visibleMessage,
							okType: 'button-compass'
						});
					} else {
						Errors.set('store', err.code + ': An error occurred while performing store operations.');
					}
				});
			});
			$window.store.register({
				id: 'com.opennms.compass.disable_ads',
				alias: 'disable_ads',
				type: $window.store.NON_CONSUMABLE
			});
			$window.store.register({
				id: 'com.opennms.compass.disable_ads_free',
				alias: 'disable_ads_free',
				type: $window.store.NON_CONSUMABLE
			});
			$window.store.when('product').updated(function(p) {
				$scope.$evalAsync(function() {
					//$log.debug('IAP: product updated: ' + angular.toJson(p));
					$scope.products[p.alias] = p;
					if (p.owned) {
						Errors.clear('store');
					}
					$rootScope.$broadcast('opennms.product.updated', p);
				});
			});
			$window.store.when('disable_ads').approved(function(product) {
				$scope.$evalAsync(function() {
					$log.info('IAP: disable_ads approved.');
					Settings.disableAds();
					$ionicLoading.hide();
					product.finish();
				});
			});
			$window.store.when('disable_ads_free').approved(function(product) {
				$scope.$evalAsync(function() {
					$log.info('IAP: disable_ads_free approved.');
					Settings.disableAds();
					$ionicLoading.hide();
					product.finish();
				});
			});
			$window.store.ready(function() {
				$log.debug('IAP: Store is ready.');
				Errors.clear('store');
				Servers.getDefault().then(function(server) {
					if (!server) {
						// assume this is a first-launch and do the refresh
						// a second time to restore purchases
						$window.store.refresh();
					}
					deferred.resolve(true);
				});
			});
			$window.store.refresh();
		} else {
			$log.error('IAP: Not available.');
			deferred.resolve(false);
		}
		return deferred.promise;
	}

	function purchase(alias) {
		var deferred = $q.defer(),
			order;
		if ($window.store) {
			order = $window.store.order(alias);
			order.then(function(p) {
				$log.info('IAP.purchase: order initiated!');
				$log.debug('IAP.purchase: ' + angular.toJson(p));
				util.trackEvent('IAP', 'purchase', 'IAP Purchase', alias);
				deferred.resolve(p);
			});
			order.error(function(err) {
				var errorMessage = err.code + ': ' + err.message;
				$log.error('IAP.purchase: Error: ' + errorMessage);
				util.trackEvent('IAP', 'error', 'IAP Error', errorMessage);
				deferred.reject(err);
			});
		} else {
			deferred.reject();
		}
		return deferred.promise;
	}

	function refresh() {
		var deferred = $q.defer();
		if ($window.store) {
			$ionicLoading.show({
				template: '<ion-spinner class="spinner-compass" style="vertical-align: middle; display: inline-block"></ion-spinner> <span style="padding-left: 10px; line-height: 28px">Restoring Purchases...</span>'
			});
			util.trackEvent('IAP', 'refresh', 'IAP Refresh');
			$window.store.refresh();
			$timeout(function() {
				$ionicLoading.hide();
				deferred.resolve(true);
			}, HIDE_IAP_LOADING_TIMEOUT);
		} else {
			deferred.reject();
		}
		return deferred.promise;
	}

	return {
		get: function() {
			return $scope.products;
		},
		init: init,
		purchase: purchase,
		refresh: refresh
	};
});
