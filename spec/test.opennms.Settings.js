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

describe('opennms.Settings', function() {
	'use strict';

	var $httpBackend, $rootScope, $timeout;

	beforeEach(function() {
		//console.info("=== opennms.Settings ===");
		jasmine.clock().install();
		angular.module('ionic', []);
		angular.module('ngCordova', []);
	});

	beforeEach(function() {
		angular.module('uuid4');
	});

	beforeEach(inject(function($injector) {
		$httpBackend = $injector.get('$httpBackend');
		$rootScope   = $injector.get('$rootScope');
		$timeout     = $injector.get('$timeout');
	}));

	afterEach(function() {
		$httpBackend.verifyNoOutstandingExpectation();
		$httpBackend.verifyNoOutstandingRequest();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it('should be true', function() {
		//$httpBackend.expectGET('https://opennms/foo').respond(200, mockPageOne);
		expect(true).toBeTruthy();
		//$httpBackend.flush();
	});
});
