#!/usr/bin/env node

var exec = require('child_process').exec;
var plist = 'platforms/ios/OpenNMS/OpenNMS-Info.plist';

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

exec('/usr/libexec/PlistBuddy -c "Merge hooks/after_prepare/fix_orientation_ios.plist" platforms/ios/OpenNMS/OpenNMS-Info.plist', puts);
