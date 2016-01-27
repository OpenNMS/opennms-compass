(function() {
	'use strict';

	var angular = require('angular'),
		Server = require('../servers/models/Server');

	require('../availability/AvailabilityService');
	require('../servers/Servers');
	require('../settings/SettingsService');

	require('../misc/Capabilities');
	require('../misc/Errors');
	require('../misc/Info');
	require('../misc/util');

	var editServerTemplate = require('ngtemplate!html!./edit-server.html');

	angular.module('opennms.controllers.Settings', [
		'ionic',
		'opennms.services.Availability',
		'opennms.services.Capabilities',
		'opennms.services.Errors',
		'opennms.services.Info',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util'
	])
	.factory('ServerModal', function($q, $rootScope, $log, $ionicModal, Servers, Settings) {
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
				modal.show();
				return modal;
			}, function(err) {
				$log.error('ServerModal.open: failed: ' + angular.toJson(err));
				return $q.reject(err);
			});
		};

		$scope.closeModal = function() {
			if ($scope.server) {
				$scope.server = undefined;
			}
			if ($scope.modal) {
				$scope.modal.hide();
				$scope.modal.remove();
				$scope.modal = undefined;
			}
		};

		$scope.saveServer = function() {
			var server = $scope.server;
			$log.debug('ServerModal.save: Saving server: ' + angular.toJson(server));
			if (server && server.name && server.url) {
				Servers.save(server)['finally'](function() {
					$scope.closeModal();
				});
			} else {
				$log.warn('Server did not have a name or URL!');
				$scope.closeModal();
			}
		};

		return {
			open: $scope.openModal,
			close: $scope.closeModal
		};
	})
	.controller('SettingsCtrl', function($scope, $log, $timeout, $window, $filter, $ionicListDelegate, $ionicPlatform, $ionicPopup, ServerModal, AvailabilityService, Capabilities, Errors, Info, Servers, Settings, util) {
		$log.info('Settings initializing.');
		$scope.util = util;

		$scope.addServer = function() {
			ServerModal.open().then(function() {
				$ionicListDelegate.$getByHandle('server-list').closeOptionButtons();
			});
		};

		$scope.editServer = function(server) {
			server.originalName = server.name;
			ServerModal.open(server).then(function() {
				$ionicListDelegate.$getByHandle('server-list').closeOptionButtons();
			});
		};

		$scope.deleteServer = function(server) {
			return Servers.remove(server).then(function() {
				return server;
			});
		};

		$scope.selectServer = function(server) {
			$ionicListDelegate.$getByHandle('server-list').closeOptionButtons();
			$log.debug('SettingsCtrl.selectServer: ' + server.name);
			Servers.setDefault(server);
		};

		var initDefaultServer = function() {
			Servers.getDefault().then(function(defaultServer) {
				$scope.defaultServer = defaultServer;
			});
		};

		var init = function() {
			$log.debug('SettingsCtrl.init(): ' + $scope.launchAddServer);
			initDefaultServer();
			Servers.all().then(function(servers) {
				if ($scope.launchAddServer) {
					$scope.launchAddServer = false;
					if (servers.length === 0) {
						$scope.addServer();
					}
				}
				$scope.servers = servers;
			});
			Settings.get().then(function(settings) {
				$scope.settings = settings;
			});
			Settings.version().then(function(version) {
				$scope.version = version;
			});
			Settings.build().then(function(build) {
				$scope.build = build;
			});
			$scope.errors = Errors.get();
			$scope.info = Info.get();
			$scope.canSetLocation = Capabilities.setLocation();
			AvailabilityService.supported().then(function(isSupported) {
				$scope.hasAvailability = isSupported;
			}).finally(function() {
				$scope.$broadcast('scroll.refreshComplete');
			});
		};
		init();

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
					if (i+1 !== chunks.length) {
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
			} else {
				return error.message;
			}
		};

		$scope.clearErrors = function() {
			Errors.reset();
		};

		$scope.isDefaultServer = function(server) {
			return server && $scope.defaultServer && server._id === $scope.defaultServer._id;
		};

		$scope.getRefreshInterval = function() {
			return Math.round(parseInt($scope.settings.refreshInterval, 10)/1000);
		};

		$scope.handleKey = function(ev) {
			if (ev.which === 13) {
				util.hideKeyboard();
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		util.onInfoUpdated(function() {
			$scope.info = Info.get();
			$scope.canSetLocation = Capabilities.setLocation();
			$scope.$broadcast('scroll.refreshComplete');
		});
		util.onSettingsUpdated(function() {
			init();
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
		util.onInfoUpdated(init);

		$scope.$on('modal.shown', init);
	});

}());
