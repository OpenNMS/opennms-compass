(function() {
	'use strict';

	/* global ionic: true */

	angular.module('opennms.services.Push', [
		'ionic',
		'ngCordova',
	])
	.factory('Push', function($cordovaPush) {
		console.log('Push: Initializing.');

		return {
		};
	});

}());
