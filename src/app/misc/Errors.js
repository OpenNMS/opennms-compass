(function() {
	'use strict';

	var angular = require('angular');

	angular.module('opennms.services.Errors', [
		'ionic'
	])
	.factory('Errors', function($rootScope, $log) {
		$log.info('Errors: Initializing.');

		var _errors = {};

		var getErrorsAsArray = function() {
			var ret = [];
			for (var key in _errors) {
				if (_errors.hasOwnProperty(key)) {
					ret.push({
						type: key,
						message: _errors[key]
					});
				}
			}
			return ret;
		};
		var setError = function(type, message) {
			if (message !== _errors[type]) {
				_errors[type] = message;
				$rootScope.$broadcast('opennms.errors.updated', getErrorsAsArray());
			}
		};
		var clearError = function(type) {
			if (_errors[type]) {
				delete _errors[type];
				$rootScope.$broadcast('opennms.errors.updated', getErrorsAsArray());
			}
		};
		var getErrors = function(type) {
			if (type) {
				return _errors[type];
			} else {
				return getErrorsAsArray();
			}
		};
		var resetErrors = function() {
			var oldErrors = getErrors();
			_errors = {};
			if (oldErrors.length > 0) {
				$rootScope.$broadcast('opennms.errors.updated', getErrorsAsArray());
			}
		};

		return {
			set: setError,
			clear: clearError,
			reset: resetErrors,
			get: getErrors,
			hasError: function(type) {
				if (_errors[type]) {
					return true;
				} else {
					return false;
				}
			}
		};
	});

}());
