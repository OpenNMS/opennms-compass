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

require('../db/db');

require('../alarms/AlarmService');
require('../availability/AvailabilityService');
require('../nodes/ResourceService');
require('../outages/OutageService');
require('../servers/Servers');

require('../misc/Errors');
require('../misc/util');

angular.module('opennms.dashboard.Service', [
	'ionic',
	'rt.debounce',
	'opennms.services.Alarms',
	'opennms.services.Availability',
	'opennms.services.DB',
	'opennms.services.Errors',
	'opennms.services.Outages',
	'opennms.services.Resources',
	'opennms.services.Servers',
	'opennms.services.Util'
])
.factory('DashboardService', function($log, $q, $rootScope, AlarmService, AvailabilityService, db, debounce, Errors, OutageService, ResourceService, Servers, util) {
	$log.info('Initializing DashboardService.');

	var dashboarddb = db.get('dashboard');

	var watchers = {};

	var refresh = {
		alarms: function() {
			return AlarmService.severities().then(function(res) {
				var severities = [], severity, total = 0;

				for (var i=0, len=res.length; i < len; i++) {
					severity = res[i];
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
			return OutageService.get().then(function(res) {
				var data = {}, outages = [], outage, service, total = 0;

				for (var i=0, len=res.length; i < len; i++) {
					outage = res[i];
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

	var checkCache = function(type) {
		$log.debug('DashboardService.checkCache(' + type + ')');

		return Servers.getDefault().then(function(defaultServer) {
			if (defaultServer) {
				//$log.error('default server: ' + angular.toJson(defaultServer));
				dashboarddb.get(type).then(function(res) {
					if (res.server === defaultServer._id && res.update) {
						//$log.error('dashboarddb.get: ' + angular.toJson(res));
						$log.debug('DashboardService.checkCache: found cached update for ' + type);
						var update = angular.copy(res.update);
						update.stopSpinner = false;
						$rootScope.$broadcast('opennms.dashboard.update.' + type, update);
					}
				});
				return defaultServer._id;
			} else {
				return null;
			}
		}).catch(function() {
			$log.debug('DashboardService.checkCache: no cached update for ' + type + ' found');
			return null;
		});
	};

	var doRefresh = function(type) {
		$log.debug('DashboardService.refresh' + type.capitalize() + '()');

		if (!watchers[type]) {
			watchers[type] = $q.defer();
		}

		return checkCache(type).then(function(server) {
			var update = {
				type: type,
				lastUpdated: new Date()
			};

			return refresh[type]().then(function(result) {
				Errors.clear('dashboard-' + type);
				update.success = true;
				update.contents = result;
				if (server) {
					db.upsert('dashboard', {
						_id: type,
						update: update,
						server: server
					});
				} else {
					$log.warn('Unable to save dashboard.' + type + ' cache: no default server found.');
				}
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
		});
	};

	var stop = function() {
		for (var key in watchers) {
			watchers[key].reject();
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
