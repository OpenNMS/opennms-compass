(function() {
	'use strict';

	/* global cordova: true */
	/* global ionic: true */
	/* global moment: true */

	angular.module('opennms.services.Storage', [
		'ionic',
		'ngCordova',
	]).factory('StorageService', function($q, $rootScope, $timeout, $window, $ionicPlatform, $cordovaFile) {
		console.log('StorageService: Initializing.');

		var storagePath = $q.defer();
		var dirname = function(path) {
			if (path) {
				return path.replace(/\/[^\/]*$/, '/');
			} else {
				return undefined;
			}
		};

		var basename = function(path) {
			if (path) {
				return path.replace(/^.*\//, '');
			} else {
				return undefined;
			}
		};

		$ionicPlatform.ready(function() {
			$timeout(function() {
				if ($window.cordova && $window.cordova.file) {
					if (ionic.Platform.isIOS()) {
						storagePath.resolve($window.cordova.file.syncedDataDirectory);
					} else if (ionic.Platform.isAndroid()) {
						storagePath.resolve($window.cordova.file.dataDirectory);
					} else {
						console.log('StorageService: unknown platform');
						storagePath.reject();
					}
				} else {
					console.log('StorageService: $window.cordova.file not found');
					storagePath.reject();
				}
			}, 1000);
		});

		storagePath.promise.then(function(path) {
			console.log('StorageService: using storage path: ' + path);
		}, function(err) {
			console.log('StorageService: unable to determine appropriate storage path');
		});

		var queue = async.priorityQueue(function(task, callback) {
			$rootScope.$evalAsync(function() {
				//console.log('calling next task in queue with arguments: ' + angular.toJson(task.args));
				callback(task.fn.apply(null, task.args));
			}, 1);
		});

		var loadFile = function(filename) {
			var deferred = $q.defer();
			queue.push({
				fn: doLoadFile,
				args: [filename]
			}, 1, function(results) {
				results.then(function(r) {
					//console.log('doLoadFile: got contents: ' + angular.toJson(r));
					deferred.resolve(r);
				}, function(err) {
					//console.log('doLoadFile: got failure: ' + angular.toJson(err));
					deferred.reject(err);
				});
			});
			return deferred.promise;
		};

		var doLoadFile = function(filename) {
			//console.log('--- doLoadFile: start: ' + filename + ' ---');
			if (!filename) {
				return $q.reject('No filename specified!');
			}

			return storagePath.promise.then(function(path) {
				return $cordovaFile.readAsText(path, filename);
			}).then(function(text) {
				//console.log('StorageService.doLoadFile: contents of ' + filename + ': ' + text);
				//console.log('--- doLoadFile: end ---');
				if (angular.isString(text)) {
					return angular.fromJson(text);
				} else {
					return text;
				}
			}, function(err) {
				//console.log('StorageService.doLoadFile: failed: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		var saveFile = function(filename, data) {
			var deferred = $q.defer();
			queue.push({
				fn: doSaveFile,
				args: [filename, data]
			}, 2, function(results) {
				results.then(function(r) {
					//console.log('doSaveFile: got results: ' + angular.toJson(r));
					deferred.resolve(r);
				}, function(err) {
					//console.log('doSaveFile: got failure: ' + angular.toJson(err));
					deferred.reject(err);
				});
			});
			return deferred.promise;
		};

		var doSaveFile = function(filename, data) {
			if (!filename) {
				return $q.reject('No filename specified!');
			}

			var contents = data;
			if (!angular.isString(data)) {
				contents = angular.toJson(data, true);
			}
			if (!data) {
				console.log('StorageService.saveFile: WARNING: overwriting ' + filename + ' with nothing!');
			}

			console.log('StorageService.saveFile: saving contents: ' + contents);
			return storagePath.promise.then(function(path) {
				return $cordovaFile.writeFile(path, filename, contents, true).then(function(results) {
					console.log('StorageService.saveFile: wrote ' + filename + ' to ' + angular.toJson(path));
					return data;
				});
			});
		};

		return {
			load: loadFile,
			save: saveFile,
		};
	});

}());
