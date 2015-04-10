#!/usr/bin/env node

var fs = require('fs');
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

if (fs.existsSync('/usr/libexec/PlistBuddy') && fs.existsSync(plist)) {
	exec('/usr/libexec/PlistBuddy -c "Merge hooks/data/fix_orientation_ios.plist" ' + plist, puts);
}
