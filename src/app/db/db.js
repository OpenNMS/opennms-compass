(function() {
	'use strict';

	var angular = require('angular');

	window.PouchDB = require('pouchdb/dist/pouchdb.min');
	require('pouchdb-find/dist/pouchdb.find.min');
	require('angular-pouchdb');

	var Constants = require('../misc/Constants');

	angular.module('opennms.services.DB', [
		'ionic',
		'pouchdb',
		'uuid4'
	]).factory('db', function($q, $rootScope, $log, $window, $ionicPlatform, pouchDB, pouchDBDecorators, uuid4) {
		$log.info('DB: Initializing.');

		var dbs = {};
		var pouchDbs = {};

		var getPouch = function(dbname) {
			if (!pouchDbs.hasOwnProperty(dbname)) {
				var db = pouchDB(dbname);

				db.find        = pouchDBDecorators.qify(db.find);
				db.createIndex = pouchDBDecorators.qify(db.createIndex);
				db.getIndexes  = pouchDBDecorators.qify(db.getIndexes);
				db.deleteIndex = pouchDBDecorators.qify(db.deleteIndex);

				pouchDbs[dbname] = db;
			}
			return pouchDbs[dbname];
		};

		var noindexes = function(entry) {
			return entry.id.indexOf('_design') !== 0; // eslint-disable-line no-magic-numbers
		};

		var allDocs = function(dbname) {
			return getPouch(dbname).allDocs({
				include_docs: true
			}).then(function(docs) {
				if (docs.total_rows > 0) { // eslint-disable-line no-magic-numbers
					return docs.rows.filter(noindexes).map(function(row) {
						return row.doc;
					});
				}

				return [];
			});
		};

		var upsert = function(dbname, doc) {
			var createDoc = function() {
				return getPouch(dbname).post(doc).then(function(response) {
					doc._id = response.id;
					doc._rev = response.rev;
					return doc;
				});
			};

			if (!doc._id) {
				return createDoc();
			}

			return getPouch(dbname).get(doc._id).then(function(existing) {
				var newdoc = angular.copy(doc);
				delete newdoc._id;
				delete newdoc._rev;
				delete newdoc._deleted;
				var updated = angular.merge({}, existing, newdoc);
				return getPouch(dbname).put(updated).then(function(response) {
					doc._id = response.id;
					doc._rev = response.rev;
					return doc;
				}).catch(function(err) {
					if (err.name === 'conflict') {
						$log.debug('Conflict occurs attempting to upsert doc._id=' + existing._id + ', doc._rev=' + existing._rev);
					}
					return $q.reject(err);
				});
			}).catch(function(err) {
				if (err.error && (err.reason === 'missing'||err.reason === 'deleted')) {
					return createDoc();
				}

				$log.error('Unable to upsert ' + doc._id + ': ' + err.reason);
				return $q.reject(err);
			});
		};

		var remove = function(dbname, id) {
			return getPouch(dbname).get(id).then(function(existing) {
				if (!existing._deleted) {
					return getPouch(dbname).remove(existing);
				}

				// already deleted
				return true;
			}).catch(function(err) {
				if (err.status === Constants.HTTP_NOT_FOUND || err.error && err.reason === 'missing') {
					return true;
				}

				$log.error('Unable to remove ' + id + ': ' + err.reason);
				return $q.reject(err);
			});
		};

		return {
			get: getPouch,
			all: allDocs,
			upsert: upsert,
			remove: remove
		};
	});

}());
