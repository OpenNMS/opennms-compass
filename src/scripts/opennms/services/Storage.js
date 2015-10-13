(function() {
	'use strict';

	/* global async: true */
	/* global cordova: true */
	/* global ionic: true */
	/* global moment: true */

	angular.module('opennms.services.Storage', [
		'ionic',
		'ngCordova',
		'JSONStorage',
	]).factory('StorageService', function($q, $rootScope, $log, $timeout, $window, $ionicPlatform, $cordovaFile, JSONStorage) {
		$log.info('StorageService: Initializing.');

		$log.info('Current platform: ' + ionic.Platform.platform());

		if (ionic.Platform.isIOS() || ionic.Platform.isAndroid() || ionic.Platform.isWindowsPhone()) {
			$log.info('On a device, using local backend.');
			JSONStorage.setDefaultBackend('local');
		} else {
			$log.info('In a browser, using memory backend.');
			JSONStorage.setDefaultBackend('memory');
		}

		var backendArg = function(local) {
			return local? 'local':undefined;
		};

		var loadFile = function(filename, local) {
			return JSONStorage.readFile(filename, backendArg(local)).then(function(results) {
				return results.contents;
			}).then(function(results) {
				//$log.debug('StorageService.loadFile('+filename+'): results: ' + angular.toJson(results));
				return results;
			}, function(err) {
				if (err && err.error && !err.error.contains('does not exist')) { 
					$log.error('StorageService.loadfile('+filename+'): error: ' + angular.toJson(err));
				}
				return $q.reject(err);
			});
		};

		var saveFile = function(filename, data, local) {
			return JSONStorage.writeFile(filename, data, backendArg(local)).then(function() {
				return data;
			}).then(function(results) {
				//$log.debug('StorageService.saveFile('+filename+'): results: ' + angular.toJson(results));
				return results;
			}, function(err) {
				$log.error('StorageService.saveFile('+filename+'): error: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var listFiles = function(dir, local) {
			return JSONStorage.listFiles(dir, backendArg(local)).then(function(results) {
				return results.contents;
			}).then(function(results) {
				//$log.debug('StorageService.listFiles('+dir+'): results: ' + angular.toJson(results));
				if (results && angular.isArray(results)) {
					return results;
				} else {
					return [];
				}
			}, function(err) {
				if (err && err.error && !err.error.contains('does not exist')) { 
					$log.error('StorageService.listFiles('+dir+'): error: ' + angular.toJson(err));
				}
				return [];
			});
		};

		var removeFile = function(filename, local) {
			return JSONStorage.removeFile(filename, backendArg(local)).then(function(results) {
				//$log.debug('StorageService.removeFile('+filename+'): results: ' + angular.toJson(results));
				return results;
			}, function(err) {
				$log.error('StorageService.removeFile('+filename+'): error: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		return {
			list: listFiles,
			load: loadFile,
			save: saveFile,
			remove: removeFile,
		};
	});

}());
