(function() {
	'use strict';

	var angular = require('angular');

	window.PouchDB = require('pouchdb/dist/pouchdb.min');
	require('pouchdb-find/dist/pouchdb.find.min');
	require('angular-pouchdb');

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
			return entry.id.indexOf('_design') !== 0;
		};

		var allDocs = function(dbname) {
			return getPouch(dbname).allDocs({
				include_docs: true
			}).then(function(docs) {
				if (docs.total_rows > 0) {
					return docs.rows.filter(noindexes).map(function(row) {
						return row.doc;
					});
				} else {
					return [];
				}
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
				delete doc._id;
				delete doc._rev;
				angular.extend(existing, doc);
				return getPouch(dbname).put(existing).then(function(response) {
					doc._id = response.id;
					doc._rev = response.rev;
					return doc;
				});
			}).catch(function(err) {
				if (err.error && err.reason === 'missing') {
					return createDoc();
				} else {
					$log.error('Unable to upsert ' + doc._id + ': ' + err.reason);
					return $q.reject(err);
				}
			});
		};

		return {
			get: getPouch,
			all: allDocs,
			upsert: upsert
		};
	});

}());
