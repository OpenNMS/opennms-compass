#!/usr/bin/env node

/* eslint-disable no-console */

var fs = require('fs.extra');
var exec = require('child_process').exec;

var rootdir = process.argv[2];

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

if (rootdir) {
  if (fs.existsSync('platforms/ios/OpenNMS/OpenNMS-Info.plist')) {
    exec('/usr/libexec/PlistBuddy -c "Merge hooks/ApplicationQuerySchemes.plist" platforms/ios/OpenNMS/OpenNMS-Info.plist', puts);
  }

}

/* eslint-enable no-console */
