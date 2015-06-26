/*global jasmine: true */
/*global describe: true */
/*global expect: true */
/*global inject: true */
/*global beforeEach: true */
/*global afterEach: true */
/*global it: true */
/*global spyOn: true */
/*global xit: true */
/*global xdescribe: true */

describe('Info and Capabilities', function() {
	'use strict';

	var doNothing = function() {
		return undefined;
	};

	var $q,
		$rootScope,
		$timeout,
		$httpBackend,
		Capabilities,
		Info;

	beforeEach(function() {
		console.info('--------------------------------------------------------------------------------');
		jasmine.clock().install();
		angular.module('ngCordova', []);
		angular.module('cordovaHTTP', []);
	});

	beforeEach(function() {
		module('opennms.services.Capabilities');
		module('opennms.services.Info');
		module('opennms.services.Rest');
	});

	beforeEach(module(function($provide) {
		$provide.value('cordovaHTTP', {});
		$provide.value('util', {
			onSettingsUpdated: doNothing
		});
	}));

	beforeEach(inject(function($injector) {
		$q           = $injector.get('$q');
		$httpBackend = $injector.get('$httpBackend');
		$rootScope   = $injector.get('$rootScope');
		Capabilities = $injector.get('Capabilities');
		Info         = $injector.get('Info');
	}));

	afterEach(function() {
		$httpBackend.verifyNoOutstandingExpectation();
		$httpBackend.verifyNoOutstandingRequest();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it('Unknown OpenNMS Version', function() {
		expect(Info.validateVersion('14.0.0')).toBe(false);
		expect(Info.validateVersion('14.0.2')).toBe(false);
		expect(Info.validateVersion('14.0.3')).toBe(false);
		expect(Info.validateVersion('15.0.0')).toBe(false);
		expect(Info.validateVersion('15.0.2')).toBe(false);
		expect(Capabilities.graphs()).toBe(false);
		expect(Capabilities.outageSummaries()).toBe(false);
		expect(Capabilities.setLocation()).toBe(false);
	});

	it('OpenNMS 14.0.2', function() {
		angular.extend(Info.get(), {
			version: '14.0.2',
			numericVersion: 14.0,
			displayVersion: '14.0.2',
			packageName: 'opennms',
			packageDescription: 'OpenNMS'
		});
		expect(Info.validateVersion('14.0.0')).toBe(true);
		expect(Info.validateVersion('14.0.2')).toBe(true);
		expect(Info.validateVersion('14.0.3')).toBe(false);
		expect(Info.validateVersion('15.0.0')).toBe(false);
		expect(Info.validateVersion('15.0.2')).toBe(false);
		expect(Capabilities.graphs()).toBe(false);
		expect(Capabilities.outageSummaries()).toBe(false);
		expect(Capabilities.setLocation()).toBe(false);
	});

	it('OpenNMS 14.0.3', function() {
		angular.extend(Info.get(), {
			version: '14.0.3',
			numericVersion: 14.0,
			displayVersion: '14.0.3',
			packageName: 'opennms',
			packageDescription: 'OpenNMS'
		});
		expect(Info.validateVersion('14.0.0')).toBe(true);
		expect(Info.validateVersion('14.0.2')).toBe(true);
		expect(Info.validateVersion('14.0.3')).toBe(true);
		expect(Info.validateVersion('15.0.0')).toBe(false);
		expect(Info.validateVersion('15.0.2')).toBe(false);
		expect(Capabilities.graphs()).toBe(false);
		expect(Capabilities.outageSummaries()).toBe(true);
		expect(Capabilities.setLocation()).toBe(false);
	});

	it('OpenNMS 15.0.0', function() {
		angular.extend(Info.get(), {
			version: '15.0.0',
			numericVersion: 15.0,
			displayVersion: '15.0.0',
			packageName: 'opennms',
			packageDescription: 'OpenNMS'
		});
		expect(Info.validateVersion('14.0.0')).toBe(true);
		expect(Info.validateVersion('14.0.2')).toBe(true);
		expect(Info.validateVersion('14.0.3')).toBe(true);
		expect(Info.validateVersion('15.0.0')).toBe(true);
		expect(Info.validateVersion('15.0.2')).toBe(false);
		expect(Capabilities.graphs()).toBe(false);
		expect(Capabilities.outageSummaries()).toBe(true);
		expect(Capabilities.setLocation()).toBe(false);
	});

	it('OpenNMS 15.0.2', function() {
		angular.extend(Info.get(), {
			version: '15.0.2',
			numericVersion: 15.0,
			displayVersion: '15.0.2',
			packageName: 'opennms',
			packageDescription: 'OpenNMS'
		});
		expect(Info.validateVersion('14.0.0')).toBe(true);
		expect(Info.validateVersion('14.0.2')).toBe(true);
		expect(Info.validateVersion('14.0.3')).toBe(true);
		expect(Info.validateVersion('15.0.0')).toBe(true);
		expect(Info.validateVersion('15.0.2')).toBe(true);
		expect(Capabilities.graphs()).toBe(false);
		expect(Capabilities.outageSummaries()).toBe(true);
		expect(Capabilities.setLocation()).toBe(true);
	});

	it('OpenNMS 16.0.0', function() {
		angular.extend(Info.get(), {
			version: '16.0.0',
			numericVersion: 16.0,
			displayVersion: '16.0.0',
			packageName: 'opennms',
			packageDescription: 'OpenNMS'
		});
		expect(Info.validateVersion('14.0.0')).toBe(true);
		expect(Info.validateVersion('14.0.2')).toBe(true);
		expect(Info.validateVersion('14.0.3')).toBe(true);
		expect(Info.validateVersion('15.0.0')).toBe(true);
		expect(Info.validateVersion('15.0.2')).toBe(true);
		expect(Capabilities.graphs()).toBe(true);
		expect(Capabilities.outageSummaries()).toBe(true);
		expect(Capabilities.setLocation()).toBe(true);
	});

	it('should validate for Meridian', function() {
		angular.extend(Info.get(), {
			version: '2015.1.0',
			numericVersion: 2015.1,
			displayVersion: '2015.1.0',
			packageName: 'meridian',
			packageDescription: 'OpenNMS Meridian'
		});
		expect(Info.validateVersion('2015.1.0')).toBe(true);
		expect(Capabilities.graphs()).toBe(false);
		expect(Capabilities.outageSummaries()).toBe(true);
		expect(Capabilities.setLocation()).toBe(true);
	});

});
