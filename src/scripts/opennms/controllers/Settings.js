(function() {
	'use strict';

	/* global ionic: true */
	/* global Server: true */

	angular.module('opennms.controllers.Settings', [
		'ionic',
		'opennms.services.Availability',
		'opennms.services.Capabilities',
		'opennms.services.Errors',
		'opennms.services.IAP',
		'opennms.services.Info',
		'opennms.services.Servers',
		'opennms.services.Settings',
		'opennms.services.Util',
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

			return $ionicModal.fromTemplateUrl('templates/edit-server.html', {
				scope: $scope,
				animation: 'slide-in-up',
				focusFirstInput: false,
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
			if (server.originalName && server.name !== server.originalName) {
				// They have renamed the server, we have to special-case it.
				Settings.getDefaultServerName().then(function(defaultServerName) {
				var operations = [];
					operations.push(Servers.remove(server.originalName));
					operations.push(Servers.put(new Server(server)));
					if (defaultServerName === server.originalName) {
						// The renamed server was the default, also set default to the new name
						operations.push(Settings.setDefaultServerName(server.name));
					}
					$q.all(operations).finally(function() {
						$scope.closeModal();
					});
				});
			} else {
				Servers.put(new Server(server)).finally(function() {
					$scope.closeModal();
				});
			}
		};

		return {
			open: $scope.openModal,
			close: $scope.closeModal,
		};
	})
	.controller('SettingsCtrl', function($scope, $log, $timeout, $window, $filter, $ionicListDelegate, $ionicPlatform, $ionicPopup, ServerModal, AvailabilityService, Capabilities, Errors, IAP, Info, Servers, Settings, util) {
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
			var remove = function(s) {
				return Servers.remove(s).then(function() {
					return s;
				});
			};

			Settings.getDefaultServerName().then(function(defaultServerName) {
				if (server.name === defaultServerName) {
					return Servers.all().then(function(servers) {
						var s = [], i, len = servers.length;
						for (i=0; i < len; i++) {
							if (servers[i].name !== server.name) {
								s.push(servers[i]);
							}
						}

						if (s.length === 0) {
							// no other servers to set as default
							return remove(server);
						} else {
							// set the first remaining server as default
							return Settings.setDefaultServerName(s[0].name).then(function() {
								return remove(server);
							});
						}
					});
				} else {
					return remove(server);
				}
			});
		};

		$scope.selectServer = function(server) {
			$ionicListDelegate.$getByHandle('server-list').closeOptionButtons();
			Servers.setDefault(server);
		};

		var initDefaultServer = function() {
			var i, len = $scope.servers.length;
			for (i=0; i < len; i++) {
				if ($scope.servers[i].isDefault) {
					$scope.defaultServer = i;
					//$log.debug('default server: ' + $scope.servers[i].name);
				} else {
					//$log.debug('not default server: ' + $scope.servers[i].name);
				}
			}
			if (angular.isUndefined($scope.defaultServer) && len > 0) {
				$log.info('Settings.initDefaultServer: no default server defined.');
				Settings.setDefaultServerName($scope.servers[0].name);
			}
		};

		var init = function() {
			Servers.all().then(function(servers) {
				$scope.servers = servers;
				initDefaultServer();
				if ($scope.launchAdd) {
					$scope.launchAdd = false;
					$scope.addServer();
				}
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
				var ret = "";
				for (var i=0; i < chunks.length; i++) {
					ret += chunks[i].capitalize();
					if ((i+1) !== chunks.length) {
						ret += " ";
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

		$ionicPlatform.ready(function() {
			$scope.$evalAsync(function() {
				$scope.products = IAP.get();

				if ($window.cordova) {
					$scope.isCordova = true;
				} else {
					$scope.isCordova = false;
				}
				$scope.isIOS = ionic.Platform.isIOS();

				if ($window.appAvailability) {
					$log.debug('SettingsCtrl: checking for availability of onms://');
					$window.appAvailability.check('onms://',
						function() {
							$log.debug('SettingsCtrl: OpenNMS.app is available!');
							$scope.$evalAsync(function() {
								$scope.hasOpenNMS = true;
							});
						}, function() {
							$log.debug('SettingsCtrl: OpenNMS.app is not available.  :(');
							$scope.$evalAsync(function() {
								$scope.hasOpenNMS = false;
							});
						}
					);
				} else {
					$log.error('SettingsCtrl: Cannot check app availability.');
				}

				$log.debug('SettingsCtrl: isCordova: ' + $scope.isCordova);
				$log.debug('SettingsCtrl: isIOS:     ' + $scope.isIOS);
			});
		});

		$scope.getRefreshInterval = function() {
			return Math.round(parseInt($scope.settings.refreshInterval, 10)/1000);
		};

		$scope.removeAds = function(alias) {
			IAP.purchase(alias).then(function() {
				$log.info('SettingsCtrl.removeAds: purchase successfully initiated.');
			}, function(err) {
				$ionicPopup.alert({
					title: 'Ad Removal Failed',
					template: '<p>ERROR ' + err.code + ': Failed to remove ads: ' + err.message + '</p>',
					okType: 'button-assertive',
				});
			});
		};

		$scope.restorePurchases = function() {
			IAP.refresh().then(function() {
				$scope.products = IAP.get();
			});
		};

		var hasPurchased = function() {
			if ($scope.products && Object.keys($scope.products).length > 0) {
				if ($scope.products.disable_ads && $scope.products.disable_ads.owned) {
					return true;
				} else if ($scope.products.disable_ads_free && $scope.products.disable_ads_free.owned) {
					return true;
				}
			}
			return false;
		};

		$scope.disabled = function(alias) {
			if (hasPurchased()) {
				return true;
			} else if (alias === 'disable_ads_free' && !$scope.hasOpenNMS) {
				return true;
			}
			return false;
		};

		$scope.showUpgrade = function() {
			if ($scope.isCordova && $scope.isIOS) {
				if ($scope.products.disable_ads_free) {
					return true;
				}
			}
			return false;
		};

		$scope.handleKey = function(ev) {
			if (ev.which === 13) {
				util.hideKeyboard();
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		util.onProductUpdated(function() {
			$scope.products = IAP.get();
			$scope.$broadcast('scroll.refreshComplete');
		});
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
		util.onErrorsUpdated(function() {
			$scope.errors = Errors.get();
			$scope.$broadcast('scroll.refreshComplete');
		});
		util.onInfoUpdated(init);

		$scope.$on('$ionicView.beforeEnter', init);
	});

}());