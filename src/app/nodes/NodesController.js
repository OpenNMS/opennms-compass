(function() {
	'use strict';

	var angular = require('angular');

	require('./NodeService');

	require('../misc/Errors');
	require('../misc/util');

	var nodesTemplate = require('ngtemplate!html!./nodes.html');
	var loadingTemplate = require('ngtemplate!html!../misc/loading.html');

	angular.module('opennms.controllers.Nodes', [
		'ionic',
		'angularLocalStorage',
		'opennms.services.Errors',
		'opennms.services.Nodes',
		'opennms.services.Util'
	])
	.config(function($stateProvider) {
		$stateProvider
		.state('nodes', {
			url: '/nodes',
			templateUrl: nodesTemplate,
			controller: 'NodesCtrl'
		});
	})
	.controller('NodesCtrl', function($q, $scope, $log, $timeout, $window, $state, $ionicLoading, storage, util, Errors, NodeService) {
		$log.info('NodesCtrl: initializing.');

		$scope.searching = false;
		$scope.util  = util;
		$scope.searchString = storage.get('opennms.nodes.search-string') || '';
		$scope.nodes = [];
		var emptyPromise = $q.when();
		var lastSearch = emptyPromise;

		$scope.updateSearch = function(searchFor) {
			$scope.searching = true;
			var searchPromise = NodeService.search(searchFor);
			searchPromise['finally'](function() {
				$ionicLoading.hide();
				$scope.searching = false;
				$scope.$broadcast('scroll.refreshComplete');
			});

			searchPromise.then(function(nodes) {
				Errors.clear('nodes');
				$scope.error = false;
				//$log.debug('Got nodes:',nodes);
				$scope.searching = false;
				$scope.nodes = nodes;
				if (nodes.length === 20 && angular.isUndefined(searchFor) || searchFor.trim() === '') {
					$scope.nodes.push({id:'more'});
				}
			}, function(err) {
				Errors.set('nodes', err);
				$scope.error = true;
				$scope.nodes = [];
			});

			return searchPromise;
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
			$state.go('node-detail', {node: node.id});
		};

		$scope.refreshData = function() {
			$ionicLoading.show({
				templateUrl: loadingTemplate,
				hideOnStateChange: true
			});
			$scope.updateSearch($scope.searchString);
		};

		$scope.$watch('searchString', function(newValue) {
			storage.set('opennms.nodes.search-string', newValue);
			delayedSearch();
		});

		util.onSettingsUpdated($scope.refreshData);

		$scope.$on('ionicView.beforeEnter', function() {
			$scope.refreshData();
		});
	});

}());
