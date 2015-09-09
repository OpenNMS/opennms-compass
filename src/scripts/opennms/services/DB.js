(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.DB', [
		'ionic',
		'angularLocalStorage',
		'pouchdb',
		'uuid4',
	])
	.config(function(pouchDBProvider, POUCHDB_METHODS) {
		var extraMethods = {
			createIndex: 'qify',
			getIndexes: 'qify',
			deleteIndex: 'qify',
			find: 'qify',
		};
		pouchDBProvider.methods = angular.extend({}, POUCHDB_METHODS, extraMethods);
	}).factory('db', function($rootScope, $log, storage, pouchDB, uuid4) {
		$log.info('DB: Initializing.');

		var db = pouchDB('compass');
		db.allDocs({
			include_docs: true
		}).then(function(docs) {
			/*
			$log.debug('all docs: ' + angular.toJson(docs));
			for (var i=0, len=docs.rows.length; i < len; i++) {
				db.remove(docs.rows[i].doc);
			} */
			return docs;
		});

		return db;
	});

}());
