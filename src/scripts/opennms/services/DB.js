(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.DB', [
		'ionic',
		'lokijs',
		'uuid4',
	]).factory('db', function($q, $rootScope, $log, $window, $ionicPlatform, Loki, uuid4) {
		$log.info('DB: Initializing.');

		var dbs = {};

		var getDb = function(dbname) {
			if (!dbs[dbname]) {
				var deferred = $q.defer();
				dbs[dbname] = deferred.promise;
				var db = new Loki(dbname, {
					autosave: true,
					autosaveInterval: 5000,
					autoload: true,
					autoloadCallback: function() {
						$rootScope.$eval(function() {
							$log.info('Db.getDb: Database "' + dbname + '" autoloaded.');
							$rootScope.$broadcast('opennms.db.loaded');
							deferred.resolve(db);
						});
					},
					adapter: new $window.jsonSyncAdapter({
						prefix: 'compass.',
						suffix: '.lokidb',
					}),
				});
			}
			return dbs[dbname];
		};

		var getCollection = function(dbname, collectionName, options) {
			return getDb(dbname).then(function(db) {
				var collection = db.getCollection(collectionName);
				if (!collection) {
					collection = db.addCollection(collectionName, options);
				}
				return collection;
			});
		};

		return {
			get: getDb,
			collection: getCollection,
		};
	});

}());
