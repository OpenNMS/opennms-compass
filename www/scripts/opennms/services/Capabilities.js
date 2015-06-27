(function() {
	'use strict';

	/* global ionic: true */
	/* global VersionCompare: true */

	angular.module('opennms.services.Capabilities', [
		'ionic',
		'opennms.services.Info',
		'opennms.services.Util',
	])
	.factory('Capabilities', function(Info, util) {
		console.log('Capabilities: Initializing.');

		var hasGraphs = function() {
			if (Info.isMeridian()) {
				return Info.validateVersion('2016.1.0');
			} else {
				return Info.validateVersion('16.0.0');
			}
		};

		var hasOutageSummaries = function() {
			return Info.validateVersion('14.0.3');
		};

		var canSetLocation = function() {
			return Info.validateVersion('15.0.2');
		};

		return {
			graphs: hasGraphs,
			outageSummaries: hasOutageSummaries,
			setLocation: canSetLocation,
		};
	})
	;

}());
