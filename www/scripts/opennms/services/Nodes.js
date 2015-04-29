(function() {
	'use strict';

	/* global $: true */
	/* global ionic: true */
	/* global Node: true */

	angular.module('opennms.services.Nodes', [
		'ionic',
		'opennms.services.Info',
		'opennms.services.Rest'
	])
	.factory('NodeService', function($q, Info, RestService) {
		console.log('NodeService: Initializing.');

		var searchNodes = function(search) {
			var deferred = $q.defer();

			var params = {
				'comparator': 'ilike',
				'match': 'any',
				'label': '%' + search + '%',
				'ipInterface.ipAddress': '%' + search + '%',
				'ipInterface.ipHostName': '%' + search + '%'
			};

			RestService.getXml('/nodes', params).then(function(results) {
				/* jshint -W069 */ /* "better written in dot notation" */
				var ret = [];
				if (results && results.nodes && results.nodes.node) {
					var nodes = results.nodes.node;
					if (!angular.isArray(nodes)) {
						nodes = [nodes];
					}
					for (var i=0; i < nodes.length; i++) {
						ret.push(new Node(nodes[i]));
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'NodeService.searchNodes';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getNode = function(nodeId) {
			var deferred = $q.defer();

			RestService.getXml('/nodes/' + nodeId).then(function(results) {
				var ret;
				if (results && results.node) {
					ret = new Node(results.node);
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'NodeService.getNode';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var canSetLocation = function() {
			return Info.get().then(function(info) {
				if (info.packageName === 'meridian') {
					//console.log('NodeModal.updateData: Meridian can update geolocation.');
					return true;
				} else {
					Info.validateVersion('15.0.2').then(function(isValid) {
						//console.log('NodeModal.updateData: OpenNMS can update geolocation? ' + (isValid? 'yes':'no'));
						return isValid;
					});
				}
			});
		};

		var setLocation = function(node, longitude, latitude) {
			var deferred = $q.defer();

			RestService.put('/nodes/' + node.id + '/assetRecord', {
				'geolocation.longitude': longitude,
				'geolocation.latitude': latitude
			}).then(function() {
				deferred.resolve(true);
			}, function(err) {
				if (err.toString().contains('request was redirected')) {
					deferred.resolve(true);
				} else if (err.status === 400 || err.status === 0) {
					deferred.resolve(true);
				} else {
					err.caller = 'NodeService.setLocation';
					deferred.reject(err);
				}
			});

			return deferred.promise;
		};

		return {
			search: searchNodes,
			get: getNode,
			canSetLocation: canSetLocation,
			setLocation: setLocation,
		};
	});

}());
