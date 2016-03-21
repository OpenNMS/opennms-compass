'use strict';

var sortFavorites = function(a, b) {
	var ret = a.nodeLabel.localeCompare(b.nodeLabel);
	if (ret === 0) {
		ret = a.graphName.localeCompare(b.graphName);
	}
	return ret;
};

var angular = require('angular');

require('angular-debounce');

require('../alarms/AlarmService');
require('../availability/AvailabilityService');
require('../nodes/ResourceService');
require('../outages/OutageService');

require('../misc/Errors');
require('../misc/util');

angular.module('opennms.dashboard.Service', [
	'ionic',
	'rt.debounce',
	'opennms.services.Alarms',
	'opennms.services.Availability',
	'opennms.services.Errors',
	'opennms.services.Outages',
	'opennms.services.Resources',
	'opennms.services.Util'
])
.factory('DashboardService', function($log, $q, $rootScope, AlarmService, AvailabilityService, debounce, Errors, OutageService, ResourceService, util) {
	$log.info('Initializing DashboardService.');

	var results = {};
	var watchers = {};

	var refresh = {
		alarms: function() {
			return AlarmService.severities().then(function(results) {
				var severities = [], severity, total = 0;

				for (var i=0, len=results.length; i < len; i++) {
					severity = results[i];
					total += severity.count;
					severities.push({
						label: severity.severity.capitalize(),
						data: severity.count,
						color: util.color(severity.severity)
					});
				}

				if (total === 0) {
					severities.push({
						label: ' ',
						data: 1,
						color: util.color('NORMAL')
					});
				}
				return {
					total: total,
					data: severities
				};
			});
		},
		availability: AvailabilityService.availability,
		favorites: function() {
			return ResourceService.favorites().then(function(favs) {
				var favorite,
					graphPromises = [];

				favs.sort(sortFavorites);

				for (var i=0, len=favs.length; i < len; i++) {
					favorite = favs[i];
					graphPromises.push(ResourceService.graph(favorite.graphName));
				}

				return $q.all(graphPromises).then(function(gds) {
					var graphDefs = {}, def;
					for (var i=0, len=gds.length; i < len; i++) {
						def = gds[i];
						graphDefs[def.name] = def;
					}

					return {
						graphDefs: graphDefs,
						favorites: favs
					};
				});
			});
		},
		outages: function() {
			return OutageService.get().then(function(results) {
				var data = {}, outages = [], outage, service, total = 0;

				for (var i=0, len=results.length; i < len; i++) {
					outage = results[i];
					service = outage.monitoredService.serviceName;
					if (!data[service]) {
						data[service] = 1;
					} else {
						data[service]++;
					}
					total++;
				}

				for (service in data) {
					if (data.hasOwnProperty(service) && data[service]) {
						outages.push({
							label: service,
							data: data[service]
						});
					}
				}
				outages.sort(function(a, b) {
					var ret = b.data - a.data;
					if (ret === 0) {
						return a.label.localeCompare(b.label);
					} else {
						return ret;
					}
				});
				if (outages.length > 50) {
					outages.length = 50;
				}

				if (total === 0) {
					outages.push({
						label: ' ',
						data: 1,
						color: util.color('NORMAL')
					});
				}

				return {
					total: total,
					data: outages
				};
			});
		}
	};

	var doRefresh = function(type) {
		$log.debug('DashboardService.refresh' + type.capitalize() + '()');

		if (!watchers[type]) {
			watchers[type] = $q.defer();
		}

		var update = {
			type: type,
			lastUpdated: new Date()
		};

		return refresh[type]().then(function(result) {
			Errors.clear('dashboard-' + type);
			update.success = true;
			update.contents = result;
			return update;
		}, function(err) {
			Errors.set('dashboard-' + type, err);
			update.success = false;
			update.error = err;
			return update;
		}).finally(function() {
			$rootScope.$broadcast('opennms.dashboard.update.' + type, update);
			return update;
		});
	};

	var stop = function() {
		for (var key in watchers) {
			if (results[key]) {
				watchers[key].resolve(results[key]);
			} else {
				watchers[key].reject();
			}
		}
		watchers = {};
	};

	return {
		refreshAlarms: function() { doRefresh('alarms') },
		refreshAvailability: function() { doRefresh('availability') },
		refreshFavorites: function() { doRefresh('favorites') },
		refreshOutages: function() { doRefresh('outages') },
		stop: stop
	};
});
