(function() {
	'use strict';

	var angular = require('angular');
	require('angular-debounce');

	require('./NodeService');

	require('../db/db');

	require('../misc/Errors');
	require('../misc/util');

	var nodesTemplate = require('ngtemplate!./nodes.html');
	var loadingTemplate = require('ngtemplate!../misc/loading.html');

	angular.module('opennms.controllers.Nodes', [
		'ionic',
		'angularLocalStorage',
		'rt.debounce',
		'opennms.services.DB',
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
	.controller('NodesCtrl', function($ionicLoading, $log, $q, $scope, $state, $timeout, $window, db, debounce, Errors, NodeService, storage, util) {
		$log.info('NodesCtrl: initializing.');

		$scope.searching = false;
		$scope.util  = util;
		$scope.searchString = storage.get('opennms.nodes.search-string') || '';
		$scope.nodes = [];
		var emptyPromise = $q.when();
		var lastSearch = emptyPromise;

		var nodesdb = db.get('nodes');

		$scope.updateSearch = function(searchFor, pullToRefresh) {
			nodesdb.get('nodelist').then(function(nodes) {
				//$log.debug('nodelist=' + angular.toJson(nodes));
				if (nodes && nodes.list && nodes.searchString === searchFor) {
					$scope.nodes = nodes.list;
				}
			});

			if (!pullToRefresh) {
				$scope.searching = true;
			}
			var searchPromise = NodeService.search(searchFor);
			searchPromise['finally'](function() {
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
				db.upsert('nodes', {
					_id: 'nodelist',
					list: nodes,
					searchString: searchFor
				});
				if (nodes.length === 20 && angular.isUndefined(searchFor) || searchFor.trim() === '') {
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

		$scope.$watch('searchString', function(newValue) {
			storage.set('opennms.nodes.search-string', newValue);
			$scope.delayedSearch();
		});

		util.onSettingsUpdated($scope.delayedSearch);

		$scope.$on('ionicView.beforeEnter', function() {
			$scope.delayedSearch();
		});
	});

}());
