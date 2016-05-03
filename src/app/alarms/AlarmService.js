(function() {
	'use strict';

	var angular = require('angular'),
		Alarm = require('./models/Alarm'),
		AlarmFilter = require('./models/AlarmFilter');

	require('../misc/Capabilities');
	require('../misc/Info');
	require('../misc/Rest');
	require('../misc/util');

	angular.module('opennms.services.Alarms', [
		'ionic',
		'opennms.services.Capabilities',
		'opennms.services.Info',
		'opennms.services.Rest',
		'opennms.services.Util'
	])
	.factory('AlarmService', function($q, $log, Capabilities, Info, RestService, util) {
		$log.info('AlarmService: Initializing.');

		var info = Info.getInitialized();
		util.onInfoUpdated(function(i) {
			info = $q.when(i);
		});

		var getAlarms = function(_filter) {
			var filter = _filter || new AlarmFilter();

			return info.then(function(i) {
				var useJson = Capabilities.useJson();
				if (useJson) {
					return RestService.get('/alarms', filter.toParams(i.numericVersion), {Accept: 'application/json'}).then(function(results) {
						if (results && results.alarm) {
							var alarms = results.alarm;
							if (!angular.isArray(alarms)) {
								alarms = [alarms];
							}
							for (var i=0, len = alarms.length; i < len; i++) {
								alarms[i] = new Alarm(alarms[i], true);
							}
							return alarms;
						}

						$log.warn('AlarmService.getAlarms: unhandled response: ' + angular.toJson(results));
						return [];
					});
				}

				// no JSON, parse the XML version
				return RestService.getXml('/alarms', filter.toParams(i.numericVersion)).then(function(results) {
					/* jshint -W069 */ /* "better written in dot notation" */
					if (results && results.alarms && results.alarms._totalCount === '0') {
						return [];
					} else if (results && results.alarms && results.alarms.alarm) {
						var alarms = results.alarms.alarm;
						if (!angular.isArray(alarms)) {
							alarms = [alarms];
						}
						for (var i=0, len=alarms.length; i < len; i++) {
							alarms[i] = new Alarm(alarms[i]);
						}
						return alarms;
					}

					$log.warn('AlarmService.getAlarms: unhandled response: ' + angular.toJson(results));
					return [];
				});
			}).catch(function(err) {
				err.caller = 'AlarmService.getAlarms';
				return $q.reject(err);
			});
		};

		var getAlarm = function(alarm) {
			var deferred = $q.defer();

			var alarmId;
			if (alarm && alarm.id) {
				alarmId = alarm.id;
			} else {
				try {
					alarmId = parseInt(alarm, 10);
				} catch (err) {
					$log.warn('Unsure how to handle getAlarm() on ' + angular.toJson(alarm));
				}
			}

			if (!alarmId) {
				$log.error('AlarmService.getAlarm: invalid alarm is missing ID! ' + angular.toJson(alarm));
				deferred.reject('Alarm is missing ID!');
				return deferred.promise;
			}

			$log.debug('getAlarm('+alarmId+')');
			RestService.getXml('/alarms/' + alarmId).then(function(results) {
				/* jshint -W069 */ /* "better written in dot notation" */
				var ret;
				if (results && results.alarm) {
					ret = new Alarm(results.alarm);
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'AlarmService.getAlarm';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getSeverities = function(_filter) {
			var filter = _filter || new AlarmFilter({limit:100,minimumSeverity:'WARNING'});
			var deferred = $q.defer();

			getAlarms(filter).then(function(results) {
				var alarmSeverities = {}, alarm, legend = [];

				for (var i=0, len=results.length; i < len; i++) {
					alarm = results[i];
					if (alarmSeverities.hasOwnProperty(alarm.severity)) {
						alarmSeverities[alarm.severity]++;
					} else {
						alarmSeverities[alarm.severity] = 1;
					}
				}
				for (var sev in alarmSeverities) {
					if ({}.hasOwnProperty.call(alarmSeverities, sev)) {
						legend.push({
							severity: sev.toUpperCase(),
							count: alarmSeverities[sev]
						});
					}
				}

				var severities = util.severities();
				legend.sort(function(a, b) {
					return severities.indexOf(a.severity) - severities.indexOf(b.severity);
				});
				deferred.resolve(legend);
			}, function(err) {
				err.caller = 'AlarmService.getSeverities';
				deferred.reject(err);
			});

			return deferred.promise;
		};

		var clear = function(alarm) {
			var deferred = $q.defer();
			RestService.put('/alarms/' + alarm.id, {limit:0, clear:'true'}).then(function(response) {
				util.dirty('alarms');
				deferred.resolve(response);
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var escalate = function(alarm) {
			var deferred = $q.defer();
			RestService.put('/alarms/' + alarm.id, {limit:0, escalate:'true'}).then(function(response) {
				util.dirty('alarms');
				deferred.resolve(response);
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var acknowledge = function(alarm) {
			var deferred = $q.defer();
			RestService.put('/alarms/' + alarm.id, {limit:0, ack:'true'}).then(function(response) {
				util.dirty('alarms');
				deferred.resolve(response);
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var unacknowledge = function(alarm) {
			var deferred = $q.defer();
			RestService.put('/alarms/' + alarm.id, {limit:0, ack:'false'}).then(function(response) {
				util.dirty('alarms');
				deferred.resolve(response);
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		};

		return {
			get: getAlarms,
			alarm: getAlarm,
			severities: getSeverities,
			clear: clear,
			escalate: escalate,
			acknowledge: acknowledge,
			unacknowledge: unacknowledge
		};
	});

}());
