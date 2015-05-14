(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.controllers.Nodes', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Errors',
		'opennms.services.Modals',
		'opennms.services.Nodes',
		'opennms.services.Util',
	])
	.controller('NodesCtrl', ['$q', '$scope', '$timeout', '$window', '$ionicLoading', 'storage', 'util', 'Errors', 'Modals', 'NodeService', function($q, $scope, $timeout, $window, $ionicLoading, storage, util, Errors, Modals, NodeService) {
		console.log('NodesCtrl: initializing.');

		$scope.searching = false;
		$scope.util  = util;
		$scope.searchString = storage.get('opennms.nodes.search-string') || '';
		$scope.nodes = [];
		var emptyPromise = $q.defer();
		emptyPromise.resolve([]);
		var lastSearch = emptyPromise.promise;

		$scope.updateSearch = function(searchFor) {
			if (searchFor === undefined || searchFor.trim() === '') {
				$scope.nodes = [];
				$scope.$broadcast('scroll.refreshComplete');
			} else {
				$scope.searching = true;
				var searchPromise = NodeService.search(searchFor);
				searchPromise['finally'](function() {
					$ionicLoading.hide();
					$scope.searching = false;
					$scope.$broadcast('scroll.refreshComplete');
				});

				searchPromise.then(function(nodes) {
					Errors.clear('nodes');
					//console.log('Got nodes:',nodes);
					$scope.searching = false;
					$scope.nodes = nodes;
				}, function(err) {
					Errors.set('nodes', err);
					$scope.nodes = [];
				});

				return searchPromise;
			}
			return emptyPromise.promise;
		};

		var _delayedSearchTimeout;
		var delayedSearch = function() {
			if (_delayedSearchTimeout) {
				return;
			}
			_delayedSearchTimeout = $timeout(function() {
				_delayedSearchTimeout = undefined;
				lastSearch['finally'](function() {
					lastSearch = $scope.updateSearch($scope.searchString);
				});
			}, 200);
		};

		$scope.viewNode = function(node) {
			util.hideKeyboard();
			$timeout(function() {
				Modals.node(node);
			});
		};

		$scope.refreshData = function() {
			$ionicLoading.show({
				noBackdrop: true,
				hideOnStateChange: true
			});
			$scope.updateSearch($scope.searchString);
		};

		$scope.$watch('searchString', function(newValue) {
			storage.set('opennms.nodes.search-string', newValue);
			delayedSearch();
		});

		$scope.$on('opennms.settings.updated', function(ev, newSettings, oldSettings, changedSettings) {
			$scope.refreshData();
		});

		$scope.$on('ionicView.beforeEnter', function() {
			$scope.refreshData();
		});
	}]);

}());