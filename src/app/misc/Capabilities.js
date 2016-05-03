'use strict';

var angular = require('angular'),
	VersionCompare = require('version_compare');

var Constants = require('./Constants');

require('./Info');
require('./util');

angular.module('opennms.services.Capabilities', [
	'ionic',
	'opennms.services.Info',
	'opennms.services.Util'
])
.factory('Capabilities', function($log, $window, Info, util) {
	$log.info('Capabilities: Initializing.');

	function canAckAlarms() {
		return Info.validateVersion('14.0.0');
	}

	function hasLowMemory() {
		return Info.get().memory < Constants.MEMORY_THRESHOLD;
	}

	function hasGraphs() {
		if (hasLowMemory()) {
			// in development, allow low-memory devices to graph, for testing
			if (!__DEVELOPMENT__) {
				return false;
			}
		}
		if (Info.isMeridian()) {
			return Info.validateVersion('2016.1.0');
		}

		return Info.validateVersion('16.0.0');
	}

	function hasOutageSummaries() {
		return Info.validateVersion('14.0.3');
	}

	function canSetLocation() {
		return Info.validateVersion('15.0.2');
	}

	function useJson() {
		/*
		if (Info.isMeridian()) {
			return Info.validateVersion('2016.1.0');
		}

		return Info.validateVersion('17.1.1');
		*/
		return false;
	}

	function getAll() {
		return {
			lowMemory: hasLowMemory(),
			ackAlarms: canAckAlarms(),
			graphs: hasGraphs(),
			outageSummaries: hasOutageSummaries(),
			setLocation: canSetLocation()
		}
	}

	return {
		get: getAll,
		lowMemory: hasLowMemory,
		ackAlarms: canAckAlarms,
		graphs: hasGraphs,
		outageSummaries: hasOutageSummaries,
		setLocation: canSetLocation,
		useJson: useJson
	};
});