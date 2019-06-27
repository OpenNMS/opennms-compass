(function() {
	'use strict';

	var angular = require('angular'),
		Outage = require('./models/Outage'),
		OutageSummary = require('./models/OutageSummary');

	require('../misc/Rest');

	angular.module('opennms.services.Outages', [
		'ionic',
		'opennms.services.Rest'
	])
	.factory('OutageService', function($q, $log, RestService) {
		$log.info('OutageService: Initializing.');

		var getOutages = (all) => {
			const params = {
				orderBy: 'ifLostService',
				order: 'desc'
			};
			if (!all) {
				params.ifRegainedService = 'null';
			}
			return RestService.getXml('/outages', params).then((results) => {
				if (results && results.outage_asArray) {
					return results.outage_asArray.map((outage) => new Outage(outage));
				}
			}).catch((err) => {
				err.caller = 'OutageService.getOutages';
				return $q.reject(err);
			});
		};

		var getOutagesForNode = (nodeId) => {
			const url = '/outages/forNode/' + nodeId;
			const params = {
				limit: 50,
				orderBy: 'ifLostService',
				order: 'desc'
			};

			return RestService.getXml(url, params).then((results) => {
				if (results && results.outage_asArray) {
					return results.outage_asArray.map((outage) => new Outage(outage));
				}
				throw new Error('Invalid response.');
			}).catch((err) => {
				err.caller = 'OutageService.getOutagesForNode';
				return $q.reject(err);
			});
		};

		var getOutageSummaries = () => {
			const url = '/outages/summaries';
			return RestService.getXml(url).then((results) => {
				console.log('summaries=', results);
				if (results && results['outage-summaries_asArray']) {
					return results['outage-summaries_asArray'].map((summary) => new OutageSummary(summary));
				}
				throw new Error('Invalid response.');
			}).catch((err) => {
				err.caller = 'OutageService.getOutageSummaries';
				return $q.reject(err);
			});
		};

		return {
			get: getOutages,
			node: getOutagesForNode,
			summaries: getOutageSummaries
		};
	});

}());
