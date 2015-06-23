(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.modals.Node', [
		'ionic',
		'ngCordova',
		'opennms.services.Analytics',
		'opennms.services.Availability',
		'opennms.services.Events',
		'opennms.services.Info',
		'opennms.services.Nodes',
		'opennms.services.Outages',
		'opennms.services.Util',
	])
	.factory('NodeModal', function($q, $rootScope, $interval, $ionicModal, $ionicPopup, $cordovaGeolocation, Analytics, AvailabilityService, EventService, Info, NodeService, OutageService, util) {
		console.log('NodeModal: initializing.');
		var $scope = $rootScope.$new();
		var nodeModal = $q.defer();

		$ionicModal.fromTemplateUrl('templates/node-detail-modal.html', {
			scope: $scope,
			animation: 'slide-in-up'
		}).then(function(modal) {
			nodeModal.resolve(modal);
		});

		$scope.hide = function() {
			nodeModal.promise.then(function(modal) {
				modal.hide();
			})
		};

		$scope.show = function(node) {
			nodeModal.promise.then(function(modal) {
				$scope.node = node;
				modal.show();
			});
		};

		return {
			show: function(node) {
				$scope.show(node);
			},
		};
	});
}());
