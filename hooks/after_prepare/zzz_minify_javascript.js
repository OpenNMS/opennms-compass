#!/usr/bin/env node

var exec = require('child_process').exec;

var rootdir = process.argv[2];

var target = 'debug';
if (process.env['CORDOVA_CMDLINE'] && process.env['CORDOVA_CMDLINE'].indexOf('--release') >= 0) {
	target = 'release';
}
if (process.env.TARGET) {
	target = process.env.TARGET;
}

var platforms = (process.env.CORDOVA_PLATFORMS ? process.env.CORDOVA_PLATFORMS.toLowerCase().split(',') : []);
if (rootdir && target === 'release') {
	if (platforms.indexOf('android') >= 0 && platforms.indexOf('ios') >= 0) {
		console.log('* minifying all platforms');
		exec('gulp minify');
	} else {
		for (var i=0; i < platforms.length; i++) {
			console.log('* minifying ' + platforms[i]);
			exec('gulp minify-' + platforms[i]);
		}
	}
} else {
	console.log('* skipping minification');
	exec('gulp prepare');
}
