(function() {
	'use strict';

	var angular = require('angular'),
		Alarm = require('./Alarm'),
		AlarmFilter = require('./AlarmFilter');

	require('../misc/Rest');
	require('../misc/util');

	angular.module('opennms.services.Alarms', [
		'ionic',
		'opennms.services.Rest',
		'opennms.services.Util'
	])
	.factory('AlarmService', function($q, $log, RestService, util) {
		$log.info('AlarmService: Initializing.');

		var getAlarms = function(filter) {
			var deferred = $q.defer();

			if (!filter) {
				filter = new AlarmFilter();
			}

			RestService.getXml('/alarms', filter.toParams()).then(function(results) {
				/* jshint -W069 */ /* "better written in dot notation" */
				var ret = [];
				if (results && results['alarms'] && results['alarms']['alarm']) {
					var alarms = results['alarms']['alarm'];
					if (!angular.isArray(alarms)) {
						alarms = [alarms];
					}
					for (var i=0, len=alarms.length; i < len; i++) {
						ret.push(new Alarm(alarms[i]));
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'AlarmService.getAlarms';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getAlarm = function(alarm) {
			var deferred = $q.defer();

			var alarmId;
			if (angular.isNumber(alarm)) {
				alarmId = alarm;
			} else {
				alarmId = alarm.id;
			}

			if (!alarmId) {
				$log.error('AlarmService.getAlarm: invalid alarm is missing ID! ' + angular.toJson(alarm));
				deferred.reject('Alarm is missing ID!');
				return deferred.promise;
			}

			RestService.getXml('/alarms/' + alarmId).then(function(results) {
				/* jshint -W069 */ /* "better written in dot notation" */
				var ret;
				if (results && results['alarm']) {
					ret = new Alarm(results['alarm']);
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'AlarmService.getAlarm';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getSeverities = function(filter) {
			filter = filter || new AlarmFilter({limit:100,minimumSeverity:'WARNING'});
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
					legend.push({
						severity: sev.toUpperCase(),
						count: alarmSeverities[sev]
					});
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
			RestService.put('/alarms/' + alarm.id + '?clear=true', {limit:0}).then(function(response) {
				util.dirty('alarms');
				deferred.resolve(response);
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var escalate = function(alarm) {
			var deferred = $q.defer();
			RestService.put('/alarms/' + alarm.id + '?escalate=true', {limit:0}).then(function(response) {
				util.dirty('alarms');
				deferred.resolve(response);
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var acknowledge = function(alarm) {
			var deferred = $q.defer();
			RestService.put('/alarms/' + alarm.id + '?ack=true', {limit:0}).then(function(response) {
				util.dirty('alarms');
				deferred.resolve(response);
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var unacknowledge = function(alarm) {
			var deferred = $q.defer();
			RestService.put('/alarms/' + alarm.id + '?ack=false', {limit:0}).then(function(response) {
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
