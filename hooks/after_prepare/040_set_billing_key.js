#!/usr/bin/env node

var fs = require('fs.extra');
var path = require('path');

var rootdir = process.argv[2];

function replace_string_in_file(filename, to_replace, replace_with) {
	var data = fs.readFileSync(filename, 'utf8');
	var result = data.replace(new RegExp(to_replace, 'g'), replace_with);
	fs.writeFileSync(filename, result, 'utf8');
}

if (rootdir) {
	var billingFile = path.join(rootdir, 'platforms/android/res/values/billing_key_param.xml');
	if (fs.existsSync(billingFile)) {
		console.log('setBillingKey: ' + billingFile + ' exists');
		var buildjson = path.join(rootdir, 'build-properties.json');
		var buildobj = JSON.parse(fs.readFileSync(buildjson, 'utf8'));
		if (buildobj.billingKey) {
			console.log('setBillingKey: billingKey is configured, replacing');
			replace_string_in_file(billingFile, '\\$BILLING_KEY', buildobj.billingKey);
		} else {
			console.log('setBillingKey: no billingKey configured in build-properties.json, skipping');
		}
	}
}
