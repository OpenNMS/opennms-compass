#!/usr/bin/env node

var fs        = require('fs');
var path      = require('path');
var exec      = require('child_process').exec;

var rootdir   = process.argv[2];

var platforms = (process.env.CORDOVA_PLATFORMS ? process.env.CORDOVA_PLATFORMS.toLowerCase().split(',') : []);

if (platforms.indexOf('ios') < 0) {
	process.exit();
}

var packagejson = path.join(rootdir, 'package.json');
var configobj = JSON.parse(fs.readFileSync(packagejson, 'utf8'));
var buildjson = path.join(rootdir, 'build-properties.json');
if (fs.existsSync(buildjson)) {
	var buildobj = JSON.parse(fs.readFileSync(buildjson, 'utf8'));
	for (var prop in buildobj) {
		if(buildobj.hasOwnProperty(prop)) {
			configobj[prop] = buildobj[prop];
		}
	}
}

var plist = path.join(rootdir, 'platforms/ios/OpenNMS/OpenNMS-Info.plist');
if (fs.existsSync(plist)) {
	exec('/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ' + configobj.build + '" platforms/ios/OpenNMS/OpenNMS-Info.plist');
}
