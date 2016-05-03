(function() {
	'use strict';

	var angular = require('angular'),
		Backshift = require('backshift/dist/backshift.onms'),
		moment = require('moment'),
		CapabilityError = require('../misc/CapabilityError'),
		RestError = require('../misc/RestError');

	require('../db/db');
	require('../servers/Servers');

	require('../misc/Capabilities');
	require('../misc/Rest');
	require('../misc/util');

	angular.module('opennms.services.Resources', [
		'ionic',
		'uuid4',
		'opennms.services.Capabilities',
		'opennms.services.DB',
		'opennms.services.Rest',
		'opennms.services.Servers',
		'opennms.services.Util'
	])
	.factory('ResourceService', function($q, $rootScope, $log, Capabilities, uuid4, RestService, Servers, db, util) {
		$log.info('ResourceService: Initializing.');

		var _graphs = {};

		var favoritesDB = db.get('favorites');
		favoritesDB.createIndex({
			index: {
				fields: ['time', 'server', 'username']
			}
		});

		var hasGraphs = Capabilities.graphs();
		util.onInfoUpdated(function() {
			hasGraphs = Capabilities.graphs();
		});

		var findFavorites = function(options) {
			var fields = Object.keys(options.selector);
			// $log.debug('findFavorites: fields=' + fields);
			return favoritesDB.createIndex({
				index: {
					fields: Object.keys(options.selector)
				}
			}).then(function() {
				return favoritesDB.find(options);
			});
		};

		var _sortFunction = function(a,b) {
			if (a.typeLabel && b.typeLabel) {
				return a.typeLabel.localeCompare(b.typeLabel);
			}

			return 0; // eslint-disable-line no-magic-numbers
		};
		var getResourcesForNode = function(nodeId) {
			if (!hasGraphs) {
				return $q.reject(new CapabilityError('graphs'));
			}
			return RestService.get('/resources/fornode/' + nodeId, {}, {Accept: 'application/json'}).then(function(res) {
				//$log.debug('ResourceService.getResourcesForNode: res=' + angular.toJson(res));
				var ret = {
					label: res.label,
					id: parseInt(res.name, 10),
					children: []
				};

				if (res.children && res.children.resource) {
					if (angular.isArray(res.children.resource)) {
						ret.children = res.children.resource;
					} else {
						ret.children = [res.children.resource];
					}
				}

				return ret;
			});
		};

		var getResource = function(resourceId) {
			if (!hasGraphs) {
				return $q.reject(new CapabilityError('graphs'));
			}
			return RestService.get('/resources/' + encodeURIComponent(resourceId), {}, {Accept: 'application/json'}).then(function(res) {
				if (res.children && res.children.resource) {
					if (angular.isArray(res.children.resource)) {
						res.children = res.children.resource;
					} else {
						res.children = [res.children.resource];
					}
				} else {
					res.children = [];
				}
				return res;
			});
		};

		var getGraphNames = function(resourceId) {
			if (!hasGraphs) {
				return $q.reject(new CapabilityError('graphs'));
			}
			return RestService.get('/graphs/for/' + encodeURIComponent(resourceId), {}, {Accept: 'application/json'}).then(function(res) {
				if (res.name) {
					if (angular.isArray(res.name)) {
						return res.name;
					}

					return [res.name];
				}

				return [];
			});
		};

		var getGraph = function(graph) {
			if (!hasGraphs) {
				return $q.reject(new CapabilityError('graphs'));
			}
			if (!_graphs.hasOwnProperty(graph)) {
				_graphs[graph] = RestService.get('/graphs/' + graph, {}, {Accept: 'application/json'});
			}
			return _graphs[graph];
		};

		var withDividers = function(_resources) {
			var resources = _resources || [];
			if (resources && !angular.isArray(resources)) {
				resources = [resources];
			}
			resources.sort(_sortFunction);

			var ret = [], child, lastLabel;
			for (var i=0, len=resources.length; i < len; i++) {
				child = resources[i];
				if (child.typeLabel !== lastLabel) {
					ret.push({
						isDivider: true,
						id: child.typeLabel
					});
				}
				ret.push(child);
				lastLabel = child.typeLabel;
			}
			return ret;
		};

		var _getServer = function(caller) {
			return Servers.getDefault().then(function(server) {
				if (server && angular.isDefined(server._id) && angular.isDefined(server.username)) {
					return server;
				}

				return $q.reject('ResourceService.' + caller + ': Unable to determine default server.');
			});
		};

		var getFavorites = function() {
			if (!hasGraphs) {
				return $q.reject(new CapabilityError('graphs'));
			}
			//$log.debug('ResourceService.getFavorites()');
			return _getServer('getFavorites').then(function(server) {
				return findFavorites({
					selector: {
						server: server._id,
						username: server.username,
						time: {$gt: null}
					},
					sort: [{
						time: 'asc'
					}]
				}).then(function(result) {
					//$log.debug('ResourceService.getFavorites(): result=' + angular.toJson(result));
					if (result && result.docs) {
						return result.docs;
					}

					return [];
				}).catch(function(err) {
					$log.error('ResourceService.getFavorites(): err=' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		var getFavorite = function(resourceId, graphName) {
			if (!hasGraphs) {
				return $q.reject(new CapabilityError('graphs'));
			}
			//$log.debug('ResourceService.getFavorite(' + resourceId + ',' + graphName + ')');
			return _getServer('getFavorite').then(function(server) {
				return findFavorites({
					selector: {
						server: server._id,
						username: server.username,
						resourceId: resourceId,
						graphName: graphName
					}
				}).then(function(result) {
					/* eslint-disable no-magic-numbers */
					//$log.debug('ResourceService.getFavorite(' + resourceId + ',' + graphName + '): result=' + angular.toJson(result));
					if (result && result.docs && result.docs.length === 1) {
						return result.docs[0];
					}
					/* eslint-enable no-magic-numbers */

					$log.error('getFavorite(' + resourceId + ',' + graphName + '): failed result: ' + angular.toJson(result));
					return undefined;
				}).catch(function(err) {
					$log.error('ResourceService.getFavorite('+resourceId+','+graphName+'): err=' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		var addFavorite = function(resourceId, graphName, nodeId, nodeLabel) {
			if (!hasGraphs) {
				return $q.reject(new CapabilityError('graphs'));
			}
			return _getServer('addFavorite').then(function(server) {
				var favorite = {
					_id: uuid4.generate(),
					server: server._id,
					username: server.username,
					resourceId: resourceId,
					graphName: graphName,
					nodeId: nodeId,
					nodeLabel: nodeLabel,
					isFavorite: true,
					time: new Date().getTime()
				};
				//$log.debug('ResourceService.addFavorite(' + resourceId + ',' + graphName + '): ' + angular.toJson(favorite));
				return favoritesDB.put(favorite).then(function(result) {
					//$log.debug('ResourceService.addFavorite(' + resourceId + ',' + graphName + '): result=' + angular.toJson(result));
					favorite._rev = result.rev;
					return favorite;
				}).catch(function(err) {
					$log.error('ResourceService.addFavorite(' + resourceId + ',' + graphName + ') failed: err=' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		var removeFavorite = function(resourceId, graphName) {
			if (!hasGraphs) {
				return $q.reject(new CapabilityError('graphs'));
			}
			//$log.debug('ResourceService.removeFavorite(' + resourceId + ',' + graphName + ')');
			return _getServer('removeFavorite').then(function(server) {
				return findFavorites({
					selector: {
						server: server._id,
						username: server.username,
						resourceId: resourceId,
						graphName: graphName
					}
				}).then(function(result) {
					//$log.debug('ResourceService.removeFavorite(' + resourceId + ',' + graphName + '): result=' + angular.toJson(result));
					/* eslint-disable no-magic-numbers */
					if (result && result.docs && result.docs.length === 1) {
						return favoritesDB.remove(result.docs[0]);
					}
					/* eslint-enable no-magic-numbers */

					$log.error('removeFavorite: unhandled result: ' + angular.toJson(result));
					return $q.reject(result);
				}).catch(function(err) {
					$log.error('ResourceService.removeFavorite(' + resourceId + ',' + graphName + ') failed: err=' + angular.toJson(err));
					return $q.reject(err);
				});
			});
		};

		util.onServerRemoved(function(server) {
			//$log.debug('ResourceService.onServerRemoved: cleaning up favorites for server ' + server.name);
			return findFavorites({
				selector: {
					server: server._id,
					username: server.username
				}
			}).then(function(result) {
				/* eslint-disable no-magic-numbers */
				if (result && result.docs && result.docs.length > 0) {
					for (var i=0, len=result.docs.length; i < len; i++) {
						result.docs[i]._deleted = true;
					}
					return favoritesDB.bulkDocs(result.docs);
				}
				/* eslint-enable no-magic-numbers */

				return undefined;
			});
		});

		return {
			graphNames: getGraphNames,
			graph: getGraph,
			resources: getResourcesForNode,
			resource: getResource,
			withDividers: withDividers,
			favorites: getFavorites,
			isFavorite: getFavorite,
			favorite: addFavorite,
			unfavorite: removeFavorite
		};
	});

}());
