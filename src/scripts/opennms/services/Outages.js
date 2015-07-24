(function() {
	'use strict';

	/* global ionic: true */
	/* global Outage: true */
	/* global OutageSummary: true */

	angular.module('opennms.services.Outages', [
		'ionic',
		'opennms.services.Rest'
	])
	.factory('OutageService', function($q, RestService) {
		console.log('OutageService: Initializing.');

		var getOutages = function(all) {
			var deferred = $q.defer();
			var params = {
				orderBy: 'ifLostService',
				order: 'desc'
			};
			if (!all) {
				params.ifRegainedService = 'null';
			}
			RestService.getXml('/outages', params).then(function(results) {
				var ret = [];
				if (results && results.outages && results.outages.outage) {
					var outages = results.outages.outage;
					if (!angular.isArray(outages)) {
						outages = [outages];
					}
					for (var i=0; i < outages.length; i++) {
						ret.push(new Outage(outages[i]));
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'OutageService.getOutages';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getOutagesForNode = function(nodeId) {
			var deferred = $q.defer();
			var url = '/outages/forNode/' + nodeId;
			var params = {
				limit: 50,
				orderBy: 'ifLostService',
				order: 'desc'
			};

			RestService.getXml(url, params).then(function(results) {
				var ret = [];
				if (results && results.outages && results.outages.outage) {
					var outages = results.outages.outage;
					if (!angular.isArray(outages)) {
						outages = [outages];
					}
					for (var i=0; i < outages.length; i++) {
						ret.push(new Outage(outages[i]));
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'OutageService.getOutagesForNode';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		var getOutageSummaries = function() {
			var deferred = $q.defer();
			var url = '/outages/summaries';
			RestService.getXml(url).then(function(results) {
				var ret = [];
				if (results && results['outage-summaries'] && results['outage-summaries']['outage-summary']) {
					var summaries = results['outage-summaries']['outage-summary'];
					if (!angular.isArray(summaries)) {
						summaries = [summaries];
					}
					for (var i=0; i < summaries.length; i++) {
						ret.push(new OutageSummary(summaries[i]));
					}
				}
				deferred.resolve(ret);
			}, function(err) {
				err.caller = 'OutageService.getOutageSummaries';
				deferred.reject(err);
			});
			return deferred.promise;
		};

		return {
			get: getOutages,
			node: getOutagesForNode,
			summaries: getOutageSummaries,
		};
	});

}());
