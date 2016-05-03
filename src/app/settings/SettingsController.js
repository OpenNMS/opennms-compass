(function() {
	'use strict';

	var angular = require('angular'),
		CapabilityError = require('../misc/CapabilityError'),
		Server = require('../servers/models/Server'),
		URI = require('urijs');

	var Constants = require('../misc/Constants');

	require('angular-debounce');

	require('../availability/Service');
	require('../servers/Servers');
	require('../settings/SettingsService');

	require('../misc/Capabilities');
	require('../misc/Errors');
	require('../misc/HTTP');
	require('../misc/Info');
	require('../misc/util');

	var editServerTemplate = require('ngtemplate!./edit-server.html');

	angular.module('opennms.controllers.Settings', [
		'ionic',
		'rt.debounce',
		'opennms.services.Availability',
		'opennms.services.Capabilities',
		'opennms.services.Errors',
		'opennms.services.Info',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util',
		'opennms.util.HTTP'
	])
	.factory('ServerModal', function($ionicModal, $log, $q, $rootScope, HTTP, Servers, Settings, util) {
		var $scope = $rootScope.$new();

		$scope.openModal = function(server) {
			if (server) {
				$scope.adding = false;
				$scope.server = angular.copy(server);
			} else {
				$scope.adding = true;
				$scope.server = {};
			}

			return $ionicModal.fromTemplateUrl(editServerTemplate, {
				scope: $scope,
				animation: 'slide-in-up',
				focusFirstInput: false
			}).then(function(modal) {
				$scope.modal = modal;
				modal.show().then(function() {
					if ($scope.adding) {
						util.trackView('settings-add-server');
					} else {
						util.trackView('settings-edit-server');
					}
				});
				return modal;
			}, function(err) {
				$log.error('ServerModal.open: failed: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		$scope.closeModal = function() {
			delete $scope.server;
			delete $scope.serverError;
			if ($scope.modal) {
				$scope.modal.hide();
				$scope.modal.remove();
				delete $scope.modal;
			}
		};

		var tryServer = function(s) {
			var server = new Server(s);
			var url = new URI(server.url);
			var urls = [];

			var tryUrl = function(url) {
				if (url === undefined) {
					return $q.reject('No URLs worked.  :(');
				}

				var alarmUrl = url + 'rest/alarms/count';
				$log.debug('trying: ' + alarmUrl);

				var options = {
					headers: {
						Accept: '*/*',
						Authorization: HTTP.createBasicAuthHeader(server.username, server.password)
					}
				};

				return HTTP.get(alarmUrl, options).then(function(res) {
					return url;
				}).catch(function(err) {
					$log.error('ServerModal.tryServer: Failed to get ' + alarmUrl + ': ' + angular.toJson(err));
					return $q.reject(err);
				});
			};


			if (!url.pathname().endsWith('/')) {
				url.pathname(url.pathname() + '/');
			}
			server.url = url.toString();

			var errorStatus;
			var updateError = function(err) {
				if (errorStatus === Constants.HTTP_UNAUTHORIZED) {
					// leave unchanged, 401 should be displayed because we got a valid URL, but wrong password
					return;
				} else if (err.status === Constants.HTTP_UNAUTHORIZED) {
					// update, 401 is more important
					errorStatus = Constants.HTTP_UNAUTHORIZED;
				} else if (errorStatus !== Constants.HTTP_NOT_FOUND && err.status === Constants.HTTP_NOT_FOUND) {
					// update, valid protocol but invalid URL
					errorStatus = Constants.HTTP_NOT_FOUND;
				} else if (errorStatus === undefined) {
					// no existing status, so update
					errorStatus = err.status;
				}
			};

			$scope.saving = true;
			// first try the URL they gave us (normalized for '/')
			return tryUrl(server.url).catch(function(err) {
				updateError(err);
				// then, try with /opennms/ appended
				url.pathname(url.pathname() + 'opennms/');
				return tryUrl(url.toString());
			}).catch(function(err) {
				updateError(err);
				// then, try toggling SSL
				url = new URI(server.url);
				url.protocol(url.protocol() === 'http'? 'https':'http');
				return tryUrl(url.toString());
			}).catch(function(err) {
				updateError(err);
				// then, try the toggled with /opennms/ appended
				url.pathname(url.pathname() + 'opennms/');
				return tryUrl(url.toString());
			}).catch(function(err) {
				updateError(err);

				switch(errorStatus) {
					case Constants.HTTP_UNAUTHORIZED: return $q.reject('invalid username or password');
					case Constants.HTTP_NOT_FOUND: return $q.reject('server exists, but URL is invalid');
					default: return $q.reject('unknown error');
				}
			}).finally(function() {
				$scope.saving = false;
			});
		};

		$scope.saveServer = function() {
			var server = $scope.server;
			$scope.serverError = undefined;
			if (__DEVELOPMENT__) { $log.debug('ServerModal.save: Saving server: ' + angular.toJson(server)); }
			if (server && server.name && server.url) {
				return tryServer(server).then(function(url) {
					server.url = url;
					/*return $q.reject('force failed');*/
					return Servers.save(server).finally(function() {
						Servers.setDefault(server);
						$scope.closeModal();
					});
				}).catch(function(err) {
					$scope.serverError = err;
					$log.warn('Server check failed: ' + angular.toJson(err));
					return $q.reject(err);
				});
			}

			$log.warn('Server did not have a name or URL!');
			$scope.closeModal();
			return $q.reject('Server did not have a name or URL!');
		};

		return {
			open: $scope.openModal,
			close: $scope.closeModal
		};
	})
	.controller('SettingsCtrl', function($filter, $ionicListDelegate, $ionicPlatform, $ionicPopup, $log, $scope, $timeout, $window, AvailabilityService, debounce, Capabilities, Errors, Info, ServerModal, Servers, Settings, util) {
		$log.info('Settings initializing.');
		$scope.util = util;
		$scope.analyticsCheckbox = {};

		$scope.tabSelected = function(tab) {
			if (tab === 'servers') {
				$scope.hideAddButton = false;
			} else if (tab === 'about') {
				$scope.hideAddButton = true;
			}
			if ($scope.visible) {
				util.trackView('settings-' + tab);
			}
		};

		$scope.addServer = function() {
			ServerModal.open().then(function() {
				$ionicListDelegate.$getByHandle('settings-list').closeOptionButtons();
			});
		};

		$scope.editServer = function(server) {
			server.originalName = server.name;
			ServerModal.open(server).then(function() {
				$ionicListDelegate.$getByHandle('settings-list').closeOptionButtons();
			});
		};

		$scope.deleteServer = function(server) {
			return Servers.remove(server).then(function() {
				return server;
			});
		};

		$scope.selectServer = function(server) {
			$ionicListDelegate.$getByHandle('settings-list').closeOptionButtons();
			$scope.defaultServer = server;
			$log.debug('SettingsCtrl.selectServer: ' + server.name);
			Servers.setDefault(server);
			$scope.$broadcast('scroll.refreshComplete');
		};

		var initDefaultServer = function() {
			Servers.getDefault().then(function(defaultServer) {
				$scope.defaultServer = defaultServer;
			});
		};

		var init = debounce(200, function() { // eslint-disable-line no-magic-numbers
			$log.debug('SettingsCtrl.init(): ' + Boolean($scope.launchAddServer));
			initDefaultServer();
			Servers.all().then(function(servers) {
				if ($scope.launchAddServer) {
					$scope.launchAddServer = false;
					if (servers.length === 0) { // eslint-disable-line no-magic-numbers
						$scope.addServer();
					}
				}
				$scope.servers = servers;
			});
			Settings.get().then(function(s) {
				$scope.settings = s;
				$scope.analyticsCheckbox = { enabled: !s.enableAnalytics };
			});
			Settings.version().then(function(version) {
				$scope.version = version;
			});
			Settings.build().then(function(build) {
				$scope.build = build;
			});
			$scope.errors = Errors.get();
			$scope.info = Info.get();
			$scope.capabilities = Capabilities.get();
			AvailabilityService.supported().then(function(isSupported) {
				$scope.hasAvailability = isSupported;
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});
		});

		$scope.save = function() {
			Settings.set($scope.settings);
			if ($scope.hide) {
				$scope.hide();
			}
		};
		$scope.formatType = function(type) {
			if (type) {
				var chunks = type.split('-');
				var ret = '';
				for (var i=0, len=chunks.length; i < len; i++) {
					ret += chunks[i].capitalize();
					if (i+1 !== chunks.length) { // eslint-disable-line no-magic-numbers
						ret += ' ';
					}
				}
				return ret;
			}
			return type;
		};

		$scope.getErrorMessage = function(error) {
			if (error.message && error.message.toString) {
				return error.message.toString();
			}
			return error.message;
		};

		$scope.clearErrors = function() {
			Errors.reset();
		};

		$scope.getErrors = function() {
			if (!$scope.errors) {
				return [];
			}
			return $scope.errors.filter(function(error) {
				return !(error.message instanceof CapabilityError) && error.message.constructor.name !== 'CapabilityError';
			});
		};

		$scope.isDefaultServer = function(server) {
			return server && $scope.defaultServer && server._id === $scope.defaultServer._id;
		};

		$scope.getRefreshInterval = function() {
			return Math.round(parseInt($scope.settings.refreshInterval, 10)/Constants.MILLIS);
		};

		$scope.handleKey = function(ev) {
			if (ev.which === Constants.KEY_ENTER) {
				util.hideKeyboard();
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		$scope.$watch('analyticsCheckbox', function(newSetting, oldSetting) {
			if (oldSetting !== undefined && oldSetting.enabled !== undefined) {
				$log.debug('SettingsCtrl: opt out of analytics: ' + oldSetting.enabled + ' -> ' + newSetting.enabled);
				if (newSetting.enabled) {
					Settings.disableAnalytics();
				} else {
					Settings.enableAnalytics();
				}
			}
		}, true);

		util.onInfoUpdated(function() {
			$scope.info = Info.get();
			$scope.capabilities = Capabilities.get();
			$scope.$broadcast('scroll.refreshComplete');
			init();
		});

		util.onSettingsUpdated(init);

		util.onDefaultServerUpdated(function(newDefault) {
			$scope.defaultServer = newDefault;
			$scope.$broadcast('scroll.refreshComplete');
		});
		util.onServersUpdated(function(newServers) {
			$scope.servers = newServers;
			initDefaultServer();
			$scope.$broadcast('scroll.refreshComplete');
		});
		util.onServerRemoved(function() {
			Servers.all().then(function(servers) {
				$scope.servers = servers;
				initDefaultServer();
				$scope.$broadcast('scroll.refreshComplete');
			});
		});

		util.onErrorsUpdated(function() {
			$scope.errors = Errors.get();
			$scope.$broadcast('scroll.refreshComplete');
		});

		$scope.$on('modal.shown', function() {
			$scope.visible = true;
			init();
		});
		$scope.$on('modal.hidden', function() {
			$scope.visible = false;
		});
	});

}());
