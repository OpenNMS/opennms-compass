'use strict';

var angular = require('angular'),
	VersionCompare = require('version_compare');

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

	function hasGraphs() {
		if (Info.get().memory < 1000000000) {
			return false;
		}
		if (Info.isMeridian()) {
			return Info.validateVersion('2016.1.0');
		} else {
			return Info.validateVersion('16.0.0');
		}
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
		} else {
			return Info.validateVersion('17.1.1');
		}
		*/
		return false;
	}

	function getAll() {
		return {
			ackAlarms: canAckAlarms(),
			graphs: hasGraphs(),
			outageSummaries: hasOutageSummaries(),
			setLocation: canSetLocation()
		}
	}

	return {
		get: getAll,
		ackAlarms: canAckAlarms,
		graphs: hasGraphs,
		outageSummaries: hasOutageSummaries,
		setLocation: canSetLocation,
		useJson: useJson
	};
});