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

var platforms = (process.env.CORDOVA_PLATFORMS ? process.env.CORDOVA_PLATFORMS.toLowerCase().split(',') : []);
//console.log('platforms=',platforms);
if (rootdir) {
	if (platforms.indexOf('android') >= 0 && platforms.indexOf('ios') >= 0) {
		console.log('* preparing all platforms');
		exec('gulp prepare');
	} else {
		for (var i=0; i < platforms.length; i++) {
			console.log('* preparing ' + platforms[i]);
			exec('gulp prepare-' + platforms[i]);
		}
	}
}
