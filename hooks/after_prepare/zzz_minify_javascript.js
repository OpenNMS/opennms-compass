#!/usr/bin/env node

var exec = require('child_process').exec;

var rootdir = process.argv[2];

/*
for (var thing in process.env) {
	if (process.env.hasOwnProperty(thing) && thing.indexOf('CORDOVA_') === 0) {
		console.log(thing + ' = ' + process.env[thing]);
	}
}
*/

var target = 'release';
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
