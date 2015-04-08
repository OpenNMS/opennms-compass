#!/usr/bin/env node

//this hook installs all your plugins

// add your plugins to this list--either the identifier, the filesystem location or the URL
var addList = [
/* upstream cordova plugins */
	//'org.apache.cordova.camera',
	//'org.apache.cordova.device',
	//'org.apache.cordova.device-orientation',
	//'org.apache.cordova.dialogs',
	//'org.apache.cordova.file',
	//'org.apache.cordova.vibration',
	'cordova-plugin-console',
	'cordova-plugin-geolocation',
	'cordova-plugin-inappbrowser',
	'cordova-plugin-network-information',
	'cordova-plugin-splashscreen',
	'cordova-plugin-statusbar',

/* 3rd-party plugins */
	'cordova-plugin-admobpro',
	'https://github.com/phonegap-build/PushPlugin.git',

/* android/ios only */
	'cc.fovea.cordova.purchase',
	'com.ionic.keyboard',
	//'com.analytics.google',
	//'https://github.com/RangerRick/cordova-certificate-plugin.git',
	'https://github.com/RangerRick/cordova-HTTP.git',

/* ios only */
	'cordova-plugin-appavailability',
];

// no need to configure below

var fs = require('fs');
var path = require('path');
var sys = require('sys')
var exec = require('child_process').exec;

function puts(error, stdout, stderr) {
	if (stdout) {
		console.log('INFO:  ' + stdout);
	}
	if (stderr) {
		console.log('DEBUG: ' + stderr);
	}
	if (error) {
		console.log('ERROR: ' + error);
	}
}

addList.forEach(function(plug) {
	console.log('*** Installing plugin: ' + plug);
	exec("cordova plugin add " + plug, puts);
});
