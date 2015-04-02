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
	'org.apache.cordova.console',
	'org.apache.cordova.geolocation',
	'org.apache.cordova.inappbrowser',
	'org.apache.cordova.network-information',
	'org.apache.cordova.splashscreen',
	'org.apache.cordova.statusbar',

/* 3rd-party plugins */
	'com.google.cordova.admob',

/* android/ios only */
	'cc.fovea.cordova.purchase',
	'com.ionic.keyboard',
	//'com.analytics.google',
	'https://github.com/RangerRick/cordova-certificate-plugin.git',

/* ios only */
	'com.ohh2ahh.plugins.appavailability',
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
