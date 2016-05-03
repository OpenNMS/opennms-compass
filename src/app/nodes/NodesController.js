(function() {
	'use strict';

	var angular = require('angular');
	require('angular-debounce');

	var Constants = require('../misc/Constants');
	var Node = require('./models/Node');

	require('./NodeService');

	require('../misc/Cache');
	require('../misc/Capabilities');
	require('../misc/Errors');
	require('../misc/util');

	var MAX_NODE_LIST_LENGTH = 20;

	var nodesTemplate = require('ngtemplate!./nodes.html');
	var loadingTemplate = require('ngtemplate!../misc/loading.html');

	angular.module('opennms.controllers.Nodes', [
		'ionic',
		'angularLocalStorage',
		'rt.debounce',
		'opennms.misc.Cache',
		'opennms.services.Capabilities',
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
	.controller('NodesCtrl', function($ionicLoading, $log, $q, $scope, $state, $timeout, $window, Cache, Capabilities, debounce, Errors, NodeService, storage, util) {
		$log.info('NodesCtrl: initializing.');

		$scope.searching = false;
		$scope.util  = util;
		$scope.searchString = storage.get('opennms.nodes.search-string') || '';
		$scope.nodes = [];
		var emptyPromise = $q.when();
		var lastSearch = emptyPromise;

		var lower = function(s) {
			if (s) {
				return s.toLowerCase();
			}

			return s;
		};

		$scope.updateSearch = function(searchFor, pullToRefresh) {
			Cache.get('nodes-list-'+searchFor).then(function(nodes, Node) {
				$scope.nodes = nodes;
			});

			if (!pullToRefresh) {
				$scope.searching = true;
			}
			var searchPromise = NodeService.search(lower(searchFor));
			searchPromise.finally(function() {
				$ionicLoading.hide();
				$scope.searching = false;
				$scope.$broadcast('scroll.refreshComplete');
			});

			searchPromise.then(function(ret) {
				var nodes = [];
				for (var n=0,len=ret.length, node; n < len; n++) {
					node = ret[n];
					nodes.push({
						id: node.id,
						foreignId: node.foreignId,
						label: node.label,
						displayId: node.getDisplayId()
					});
				}
				Errors.clear('nodes');
				$scope.error = false;
				//$log.debug('Got nodes:',ret);
				$scope.searching = false;
				$scope.nodes = nodes;
				Cache.set('nodes-list-' + searchFor, nodes);
				if (nodes.length === MAX_NODE_LIST_LENGTH && (angular.isUndefined(searchFor) || searchFor.trim() === '')) {
					$scope.nodes.push({id:'more'});
				}
			}, function(err) {
				Errors.set('nodes', err);
				$scope.error = true;
				//$scope.nodes = [];
			});

			return searchPromise;
		};

		$scope.delayedSearch = function(){
			lastSearch.finally(function() {
				lastSearch = $scope.updateSearch($scope.searchString);
			});
		};

		$scope.refreshData = function() {
			$ionicLoading.show({
				templateUrl: loadingTemplate,
				hideOnStateChange: true
			});
			$scope.delayedSearch();
		};

		function resetData() {
			$scope.searching = false;
			$scope.nodes = [];
		}

		$scope.$watch('searchString', function(newValue) {
			storage.set('opennms.nodes.search-string', newValue);
			$scope.delayedSearch();
		});

		util.onSettingsUpdated($scope.delayedSearch);
		util.onLowMemory('nodes', function(currentView) {
			$log.debug('NodesCtrl: resetting data because of low memory.');
			resetData();
		});

		var lazyReset;
		$scope.$on('$ionicView.beforeEnter', function() {
			$timeout.cancel(lazyReset);
			$scope.delayedSearch();
		});
		$scope.$on('$ionicView.afterLeave', function() {
			if (Capabilities.lowMemory()) {
				resetData();
			} else {
				lazyReset = $timeout(resetData, Constants.DEFAULT_TIMEOUT);
			}
		});
	});

}());
