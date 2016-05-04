'use strict';

var angular = require('angular'),
	moment = require('moment'),
	VersionCompare = require('version_compare');

var Constants = require('./Constants');

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

	var ready = $q.defer();
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
			return {
				id: query
			};
		}
		return query;
	};

	var clean = function() {
		$log.info('Cache.clean(): starting.');
		var oldReady = ready;
		var newReady = $q.defer();
		ready = newReady;

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
					threshold = moment().subtract(Constants.DEFAULT_CACHE_LIMIT_DAYS, 'days'),
					deleteme = [];

				for (var i=0, len=docs.length, doc; i < len; i++) {
					doc = docs[i];
					if (!doc.lastUpdated || !doc.server) {
						$log.warn('Cache.clean(): Document is messed up: ' + doc._id);
						deleteme.push(doc);
					} else if (moment(doc.lastUpdated).isBefore(threshold)) {
						$log.debug('Cache.clean(): Document is old: ' + doc._id);
						deleteme.push(doc);
					} else if (servers.indexOf(doc.server) === -1) { // eslint-disable-line no-magic-numbers
						$log.debug('Cache.clean(): Document server is gone: ' + doc._id);
						deleteme.push(doc);
					}
				}
				if (deleteme.length > 0) { // eslint-disable-line no-magic-numbers
					return cachedb.bulkDocs(deleteme.map(function(doc) {
						doc._deleted = true;
						return doc;
					}));
				}

				return [];
			}).finally(function() {
				$log.info('Cache.clean(): finished.');
				oldReady.resolve(true);
				newReady.resolve(true);
			});
		});
	};

	clean();

	var get = function(_query, wrap) {
		var query = getQuery(_query);
		return $q.all({defaultServer: defaultServer.promise, ready: ready.promise}).then(function(ret) {
			var server = ret.defaultServer;
			if (!server || !server._id) {
				return $q.reject('no server configured');
			}
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
					try {
						if (angular.isArray(res.results)) {
							for (var i=0, len=res.results.length; i < len; i++) {
								res.results[i] = new wrap(res.results[i]);
							}
						} else {
							res.results = new wrap(res.results);
						}
					} catch(err) {
						$log.error('Cache.get(' + query.id + '): Failed to wrap: ' + err + ': ' + angular.toJson(res.results));
						return $q.reject(err);
					}
				}
				//$log.debug('get(' + query.id +'): ' + angular.toJson(res));
				$log.debug('Cache.get(' + query.id + '): match.');
				return res.results;
			}).catch(function(err) {
				if (__DEVELOPMENT__) { $log.debug('Cache.get(' + query.id + '): no match: ' + angular.toJson(err)); }
				return $q.reject(err);
			});
		});
	};

	var set = function(_query, results) {
		var query = getQuery(_query);
		return $q.all({defaultServer: defaultServer.promise, ready: ready.promise}).then(function(ret) {
			var server = ret.defaultServer;
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

	var remove = function(_query) {
		var query = getQuery(_query);
		return $q.all({defaultServer: defaultServer.promise, ready: ready.promise}).then(function(ret) {
			var server = ret.defaultServer;
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
