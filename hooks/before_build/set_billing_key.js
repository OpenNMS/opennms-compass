#!/usr/bin/env node

/* eslint-disable no-console */

var fs = require('fs.extra');
var path = require('path');
var libxml = require('libxmljs');

var rootdir = process.argv[2];

if (rootdir) {
	var billingFile = path.join(rootdir, 'platforms/android/res/values/billing_key_param.xml');
	if (fs.existsSync(billingFile)) {
		console.log('setBillingKey: ' + billingFile + ' exists');
		var buildjson = path.join(rootdir, 'build-properties.json');
		var buildobj = JSON.parse(fs.readFileSync(buildjson, 'utf8'));
		if (buildobj.billingKey) {
			console.log('setBillingKey: billingKey is configured, replacing file');

			var doc = new libxml.Document();
			doc.node('resources')
				.node('string', buildobj.billingKey).attr({name:'billing_key_param'});
			fs.writeFileSync(billingFile, doc.toString(), 'utf8');
		} else {
			console.log('setBillingKey: no billingKey configured in build-properties.json, skipping');
		}
	}
}

/* eslint-enable no-console */