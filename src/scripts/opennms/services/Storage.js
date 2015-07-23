(function() {
	'use strict';

	/* global async: true */
	/* global cordova: true */
	/* global ionic: true */
	/* global moment: true */

	angular.module('opennms.services.Storage', [
		'ionic',
		'ngCordova',
		'CloudStorage',
	]).factory('StorageService', function($q, $rootScope, $timeout, $window, $ionicPlatform, $cordovaFile, CloudStorage) {
		console.log('StorageService: Initializing.');

		CloudStorage.setBackend('local');

		var loadFile = function(filename) {
			return CloudStorage.readFile(filename).then(function(results) {
				return results.contents;
			}).then(function(results) {
				//console.log('StorageService.loadFile('+filename+'): results: ' + angular.toJson(results));
				return results;
			}, function(err) {
				console.log('StorageService.loadfile('+filename+'): error: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var saveFile = function(filename, data) {
			return CloudStorage.writeFile(filename, data).then(function() {
				return data;
			}).then(function(results) {
				//console.log('StorageService.saveFile('+filename+'): results: ' + angular.toJson(results));
				return results;
			}, function(err) {
				console.log('StorageService.saveFile('+filename+'): error: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var listFiles = function(dir) {
			return CloudStorage.listFiles(dir).then(function(results) {
				return results.contents;
			}).then(function(results) {
				//console.log('StorageService.listFiles('+dir+'): results: ' + angular.toJson(results));
				if (results && angular.isArray(results)) {
					return results;
				} else {
					return [];
				}
			}, function(err) {
				console.log('StorageService.listFiles('+dir+'): error: ' + angular.toJson(err));
				return [];
			});
		};

		var removeFile = function(filename) {
			return CloudStorage.removeFile(filename).then(function(results) {
				//console.log('StorageService.removeFile('+filename+'): results: ' + angular.toJson(results));
				return results;
			}, function(err) {
				console.log('StorageService.removeFile('+filename+'): error: ' + angular.toJson(err));
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
