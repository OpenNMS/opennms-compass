(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.controllers.Menu', [
		'ionic'
	])
	.controller('MenuCtrl', function($scope, $log) {
		$log.info('MenuCtrl initializing.');
	});

}());
