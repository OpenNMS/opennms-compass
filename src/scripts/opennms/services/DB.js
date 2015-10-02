(function() {
	'use strict';

	/* global ionic: true */
	/* global CloudSyncAdapter: true */

	angular.module('opennms.services.DB', [
		'ionic',
		'lokijs',
		'uuid4',
	]).factory('db', function($rootScope, $log, $window, Loki, uuid4) {
		$log.info('DB: Initializing.');

		var dbs = {};

		var getDb = function(dbname, options) {
			if (!dbs[dbname]) {
				dbs[dbname] = new Loki(dbname, {
					autosave: true,
					autosaveInterval: 5000,
					autoload: true,
					autoLoadCallback: function() {
						$rootScope.$eval(function() {
							$log.info('Db.getDb: Database ' + dbname + ' autoloaded.');
							$rootScope.$broadcast('opennms.db.loaded');
						});
					},
					adapter: new $window.cloudSyncAdapter({
						prefix: 'compass.',
						suffix: '.lokidb',
					}),
				});
			}
			return dbs[dbname];
		};

		return {
			get: getDb,
		};
	});

}());
