'use strict';

var angular = require('angular'),
	moment = require('moment'),
	VersionCompare = require('version_compare');

require('../db/db');
require('../servers/Servers');

require('./Info');
require('./util');

angular.module('opennms.misc.Cache', [
	'ionic',
	'opennms.services.DB',
	'opennms.services.Info',
	'opennms.services.Servers',
	'opennms.services.Util'
])
.factory('Cache', function($log, $q, db, Info, Servers, util) {
	$log.info('Cache: Initializing.');

	var cachedb = db.get('cache');

	var defaultServer = $q.defer();
	Servers.getDefault().then(function(d) {
		defaultServer.resolve(d);
	});
	util.onDefaultServerUpdated(function(d) {
		var newds = $q.defer();
		newds.resolve(d);
		defaultServer = newds;
	});

	var getQuery = function(query) {
		if (!(typeof query === 'object')) {
			query = {
				id: query
			}
		}
		return query;
	};

	var clean = function() {
		$log.info('Cache.clean(): starting.');

		return cachedb.compact().catch(function(err) {
			$log.warn('Cache.clean(): failed to compact database: ' + angular.toJson(err));
			return $q.reject(err);
		}).finally(function() {
			return $q.all({
				docs: db.all('cache'),
				servers: Servers.all()
			}).then(function(ret) {
				var docs = ret.docs,
					servers = ret.servers.map(function(server) {
						return server._id
					}),
					threshold = moment().subtract(7, 'days'),
					deleteme = [];

				for (var i=0, len=docs.length, doc; i < len; i++) {
					doc = docs[i];
					if (!doc.lastUpdated || !doc.server) {
						$log.warn('Cache.clean(): Document is messed up: ' + doc._id);
						deleteme.push(doc);
					} else if (moment(doc.lastUpdated).isBefore(threshold)) {
						$log.debug('Cache.clean(): Document is old: ' + doc._id);
						deleteme.push(doc);
					} else if (servers.indexOf(doc.server) === -1) {
						$log.debug('Cache.clean(): Document server is gone: ' + doc._id);
						deleteme.push(doc);
					}
				}
				if (deleteme.length > 0) {
					return cachedb.bulkDocs(deleteme.map(function(doc) {
						doc._deleted = true;
						return doc;
					}));
				} else {
					return [];
				}
			}).finally(function() {
				$log.info('Cache.clean(): finished.');
			});
		});
	};

	var get = function(query, wrap) {
		query = getQuery(query);
		return defaultServer.promise.then(function(server) {
			return cachedb.get(server._id + '-' + query.id).then(function(res) {
				for (var key in query) {
					if (key === 'id') {
						continue;
					}
					if (!angular.equals(query[key], res[key])) {
						//$log.debug('Found ' + query.id + ' for server ' + server.name + ', but query key ' + key + ' did not match.');
						return $q.reject('no match');
					}
				}
				res.results = angular.fromJson(res.results);
				//$log.debug('get(' + query.id +'): ' + angular.toJson(res));
				if (wrap) {
					if (angular.isArray(res.results)) {
						for (var i=0, len=res.results.length; i < len; i++) {
							res.results[i] = new wrap(res.results[i]);
						}
					} else {
						res.results = new wrap(res.results);
					}
				}
				//$log.debug('get(' + query.id +'): ' + angular.toJson(res));
				$log.debug('Cache.get(' + query.id + '): match.');
				return res.results;
			}).catch(function(err) {
				$log.debug('Cache.get(' + query.id + '): no match: ' + angular.toJson(err));
				return $q.reject(err);
			});
		});
	};

	var set = function(query, results) {
		query = getQuery(query);
		return defaultServer.promise.then(function(server) {
			var data = {
				_id: server._id + '-' + query.id,
				results: angular.toJson(results),
				server: server._id,
				lastUpdated: new Date()
			};

			for (var key in query) {
				if (key === 'id') {
					continue;
				}
				data[key] = query[key];
			}

			return db.upsert('cache', data).catch(function(err) {
				$log.warn('Cache.set(' + query.id + ') failed: ' + angular.toJson(err));
				return $q.reject(err);
			});
		});
	};

	var remove = function(query) {
		query = getQuery(query);
		return defaultServer.promise.then(function(server) {
			return db.remove('cache', server._id + '-' + query.id);
		});
	};

	return {
		clean: clean,
		get: get,
		set: set,
		remove: remove
	};
})
;
