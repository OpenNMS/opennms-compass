(function() {
	'use strict';

	/* global Resource: true */

	angular.module('opennms.services.Resources', [
		'ionic',
		'opennms.services.Rest'
	])
	.factory('ResourceService', function($q, RestService) {
		console.log('ResourceService: Initializing.');

		var getGraphResourceForNode = function(nodeId) {
			var deferred = $q.defer();
			var graphDefs = {},
				url = RestService.url('/measurements'),
				username = Settings.username(),
				password = Settings.password();

			var addGraphModelsToResource = function(resource) {
				var i, len = resource.graphNames.length, graphs = [], graphName, rrdGraphConverter, model;
				for (i=0; i < len; i++) {
					graphName = resource.graphNames[i];
					if (!graphDefs[graphName]) {
						continue;
					}
					rrdGraphConverter = new Backshift.Utilities.RrdGraphConverter({
						graphDef: graphDefs[graphName],
						resourceId: resource.id
					});
					model = rrdGraphConverter.model;

					// Update the model to use OpenNMS' ReST Measurements API
					model.dataProcessor = {};
					model.dataProcessor.type = 'onmsrrd';
					model.dataProcessor.url = url;
					model.dataProcessor.username = username;
					model.dataProcessor.password = password;

					graphs.push(model);
				}

				resource.graphs = graphs;

				len = resource.children.length;
				for (i=0; i < len; i++) {
					addGraphModelsToResource(resource.children[i]);
				}
			};

			RestService.get('/graphs/fornode/' + nodeId, {limit:0}).then(function(results) {
				var resource, graphDef, ret = [], res, i, len;

				if (results) {
					if (results['prefab-graphs']) {
						if (angular.isArray(results['prefab-graphs']['prefab-graph'])) {
							len = results['prefab-graphs']['prefab-graph'].length;
							for (i=0; i < len; i++) {
								graphDef = results['prefab-graphs']['prefab-graph'][i];
								graphDefs[graphDef.name] = graphDef;
							}
						} else {
							graphDef = results['prefab-graphs']['prefab-graph'];
							graphDefs[graphDef.name] = graphDef;
						}
					}
					if (results.resource) {
						resource = new Resource(results.resource);
						addGraphModelsToResource(resource);
						deferred.resolve(resource);
					}
					deferred.resolve(ret);
				} else {
					deferred.reject();
				}
			}, function(err) {
				err.caller = 'ResourceService.getGraphConverterForNode';
				deferred.reject(err);
			});

			return deferred.promise;
		};

		var getResourceForNode = function(nodeId) {
			var deferred = $q.defer();

			RestService.getXml('/resources/fornode/' + nodeId, {limit:0}).then(function(results) {
				var ret;
				if (results && results.resource) {
					ret = new Resource(results.resource);
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'ResourceService.getResourceForNode';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getGraphsForResource = function(resource) {
			var deferred = $q.defer();

			RestService.getXml('/graphs/for/' + encodeURIComponent(resource), {limit:0}).then(function(results) {
				var ret = [], i, len;
				if (results && results.names) {
					if (angular.isArray(results.names.name)) {
						len = results.names.name.length;
						for (i=0; i < len; i++) {
							ret.push(results.names.name[i]);
						}
					} else {
						ret.push(results.names.name);
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'ResourceService.getGraphsForResource';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getReport = function(report) {
			var deferred = $q.defer();

			RestService.get('/graphs/' + encodeURIComponent(report), {limit:0}, {'Accept': 'application/json'}).then(function(results) {
				deferred.resolve(results);
			}, function(err) {
				err.caller = 'ResourceService.getReport';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		return {
			get: getResourceForNode,
			graphs: getGraphResourceForNode,
			report: getReport,
		};
	});

}());
