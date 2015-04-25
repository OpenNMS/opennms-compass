(function() {
	'use strict';

	/* global ionic: true */
	/* global store: true */

	angular.module('opennms.services.IAP', [
		'ionic',
		'opennms.services.Config',
		'opennms.services.Errors',
		'opennms.services.Info',
	])
	.factory('IAP', function($q, $rootScope, $timeout, $window, $ionicPopup, Errors, Info, Settings) {
		console.log('IAP: Initializing.');

		var $scope = $rootScope.$new();
		$scope.products = {};

		var init = function() {
			var deferred = $q.defer();
			ionic.Platform.ready(function() {
				$scope.$evalAsync(function() {
					if ($window.store) {
						store.verbosity = store.INFO;
						store.error(function(err) {
							$scope.$evalAsync(function() {
								var visibleMessage;

								switch(err.code) {
									case store.ERR_PURCHASE:
										visibleMessage = "An error occurred while attempting to purchase."; break;
									case store.ERR_PAYMENT_INVALID:
										visibleMessage = "Invalid payment attempt."; break;
									case store.ERR_PAYMENT_NOT_ALLOWED:
										visibleMessage = "Payment not allowed."; break;
									case store.ERR_UNKNOWN:
										visibleMessage = "An unknown error occurred."; break;
									case store.ERR_FINISH:
										visibleMessage = "An error occurred while completing your purchase."; break;
									case store.ERR_COMMUNICATION:
										visibleMessage = "An error occurred while communicating with the store."; break;
									case store.ERR_VERIFICATION_FAILED:
										visibleMessage = "An error occurred while validating store data."; break;
									case store.ERR_BAD_RESPONSE:
										visibleMessage = "The store returned an invalid or unknown response."; break;
									case store.ERR_PAYMENT_EXPIRED:
										visibleMessage = "Your payment method has expired."; break;
								}

								if (err.code === 6777010 && err.message === 'Cannot connect to iTunes Store') {
									visibleMessage = 'Cannot connect to iTunes Store';
								}

								console.log('IAP: ERROR ' + err.code + ': ' + err.message);
								$rootScope.$broadcast('opennms.product.error', err);
								if (visibleMessage) {
									Errors.set('store', err.code + ': ' + visibleMessage);
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
						store.register({
							id: 'com.opennms.compass.disable_ads',
							alias: 'disable_ads',
							type: store.NON_CONSUMABLE
						});
						store.register({
							id: 'com.opennms.compass.disable_ads_free',
							alias: 'disable_ads_free',
							type: store.NON_CONSUMABLE
						});
						store.when('product').updated(function(p) {
							$scope.$evalAsync(function() {
								//console.log('IAP: product updated: ' + angular.toJson(p));
								$scope.products[p.alias] = p;
								if (p.owned) {
									Errors.clear('store');
								}
								$rootScope.$broadcast('opennms.product.updated', p);
							});
						});
						store.when('disable_ads').approved(function(product) {
							$scope.$evalAsync(function() {
								console.log('IAP: disable_ads approved.');
								Settings.disableAds();
								product.finish();
							});
						});
						store.when('disable_ads_free').approved(function(product) {
							$scope.$evalAsync(function() {
								console.log('IAP: disable_ads_free approved.');
								Settings.disableAds();
								product.finish();
							});
						});
						store.ready(function() {
							console.log('IAP: Store is ready.');
							Errors.clear('store');
						});
						store.refresh();
						deferred.resolve(true);
					} else {
						console.log('IAP: Not available.');
						deferred.resolve(false);
					}
				});
			});
			return deferred.promise;
		};

		var purchase = function(alias) {
			var deferred = $q.defer();
			ionic.Platform.ready(function() {
				$scope.$evalAsync(function() {
					if ($window.store) {
						var order = store.order(alias);
						order.then(function(p) {
							console.log('IAP.purchase: order initiated!');
							console.log('IAP.purchase: ' + angular.toJson(p));
							deferred.resolve(p);
						});
						order.error(function(err) {
							console.log('IAP.purchase: Error: ' + err.code + ': ' + err.message);
							deferred.reject(err);
						});
					} else {
						deferred.reject();
					}
				});
			});
			return deferred.promise;
		};

		return {
			get: function() {
				return $scope.products;
			},
			init: init,
			purchase: purchase,
		};
	});

}());