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

describe('opennms.Config', function() {
	'use strict';

	var $httpBackend, $rootScope, $timeout;

	beforeEach(function() {
		console.info('--------------------------------------------------------------------------------');
		jasmine.clock().install();
		angular.module('ionic', []);
		angular.module('ngCordova', []);
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
