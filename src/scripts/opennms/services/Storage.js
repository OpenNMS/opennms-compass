(function() {
	'use strict';

	/* global async: true */
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
			if (!path.contains('/')) {
				return undefined;
			}
			if (path) {
				return path.replace(/\/[^\/]*$/, '/');
			} else {
				return undefined;
			}
		};

		var basename = function(path) {
			if (!path.contains('/')) {
				return undefined;
			}
			if (path) {
				return path.replace(/^.*\//, '');
			} else {
				return undefined;
			}
		};

		$ionicPlatform.ready(function() {
			$timeout(function() {
				if ($window.cordova && $window.cordova.file) {
					storagePath.resolve($window.cordova.file.dataDirectory);
					/*
					if (ionic.Platform.isIOS()) {
						storagePath.resolve($window.cordova.file.syncedDataDirectory);
					} else if (ionic.Platform.isAndroid()) {
						storagePath.resolve($window.cordova.file.dataDirectory);
					} else {
						console.log('StorageService: unknown platform');
						storagePath.reject();
					}
					*/
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

		var assertParentExists = function(filename) {
			var dir = dirname(filename);
			//console.log('StorageService.doLoadFile: dirname = ' + dir);
			if (!dir) {
				return $q.when(true);
			}

			return storagePath.promise.then(function(path) {
				return $cordovaFile.checkDir(path, dir).then(function(result) {
					if (result.isDirectory) {
						return true;
					} else {
						console.log('StorageService.assertParentExists: unknown result: ' + angular.toJson(result));
						return $q.reject(result);
					}
				}, function(err) {
					if (err.code === 1) {
						// does not exist, create it
						console.log('StorageService.assertParentExists: ' + dir + ' does not exist.  Creating.');
						return $cordovaFile.createDir(path, dir);
					} else {
						console.log('StorageService.assertParentExists: unknown error: ' + angular.toJson(err));
						return $q.reject(err);
					}
				});
			});
		};

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

			return assertParentExists(filename).then(function() {
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
				console.log('StorageService.doSaveFile: WARNING: overwriting ' + filename + ' with nothing!');
			}

			console.log('StorageService.doSaveFile: saving contents: ' + contents);
			return assertParentExists(filename).then(function() {
				return storagePath.promise.then(function(path) {
					return $cordovaFile.writeFile(path, filename, contents, true).then(function(results) {
						console.log('StorageService.doSaveFile: wrote ' + filename + ' to ' + angular.toJson(path));
						return data;
					}, function(err) {
						console.log('StorageService.doSaveFile: failed to write to ' + filename + ': ' + angular.toJson(err));
						return $q.reject(err);
					});
				});
			});
		};

		var listFiles = function(dir) {
			var deferred = $q.defer();
			queue.push({
				fn: doListFiles,
				args: [dir]
			}, 1, function(results) {
				results.then(function(r) {
					//console.log('doListFiles: got results: ' + angular.toJson(r));
					deferred.resolve(r);
				}, function(err) {
					//console.log('doListFiles: got failure: ' + angular.toJson(err));
					deferred.reject(err);
				});
			});
			return deferred.promise;
		};

		var toArray = function(list) {
			return Array.prototype.slice.call(list || [], 0);
		};

		var doListFiles = function(dir) {
			if (!dir) {
				return $q.reject('No path specified!');
			}

			return storagePath.promise.then(function(path) {
				return $cordovaFile.checkDir(path, dir).then(function(result) {
					if (result.isDirectory) {
						var deferred = $q.defer();
						var dr = result.createReader();
						var entries = [];
						//console.log('StorageService.doListFiles: dr: ' + angular.toJson(dr,true));

						var readEntries = function() {
							dr.readEntries(function(results) {
								if (!results.length) {
									// nothing left to read, we're done
									//console.log('StorageService.doListFiles: finished reading: ' + angular.toJson(entries,true));
									deferred.resolve(entries);
								} else {
									// more to read, push what we have onto the entries list
									//console.log('StorageService.doListFiles: more to read, got: ' + angular.toJson(results,true));
									entries = entries.concat(toArray(results));
									readEntries();
								}
							}, function error(err) {
								$rootScope.$evalAsync(function() {
									console.log('StorageService.doListFiles: error: ' + angular.toJson(err,true));
									deferred.reject(err);
								});
							});
						};
						readEntries();

						return deferred.promise;
					} else {
						console.log('StorageService.doListFiles: unhandled result: ' + angular.toJson(result));
					}
					return [];
				}, function(err) {
					console.log('StorageService.doListFiles: error listing files in ' + dir + ': ' + angular.toJson(err));
					return [];
				});
			});
		};

		var removeFile = function(name) {
			var deferred = $q.defer();
			queue.push({
				fn: doRemoveFile,
				args: [name]
			}, 1, function(results) {
				results.then(function(r) {
					//console.log('doRemoveFile: got results: ' + angular.toJson(r));
					deferred.resolve(r);
				}, function(err) {
					//console.log('doRemoveFile: got failure: ' + angular.toJson(err));
					deferred.reject(err);
				});
			});
			return deferred.promise;
		};

		var doRemoveFile = function(name) {
			return storagePath.promise.then(function(path) {
				return $cordovaFile.removeFile(path, name);
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
