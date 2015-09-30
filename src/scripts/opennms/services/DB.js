(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.DB', [
		'ionic',
		'angularLocalStorage',
		'lokijs',
		'uuid4',
		'CloudStorage',
	]).factory('db', function($rootScope, $log, storage, Loki, uuid4, CloudStorage) {
		$log.info('DB: Initializing.');

		var loki = new Loki();
		var dbs = {};

		/*
		var load = function(dbname, options) {
			if (!dbs[dbname]) {
				dbs[dbname] = loki.addCollection(dbname, options);
			}
		};
		*/

		return loki;
	});

}());
