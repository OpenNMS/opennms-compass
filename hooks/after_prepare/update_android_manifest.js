#!/usr/bin/env node

var fs         = require('fs');
var path       = require('path');

var dom        = require('xmldom').DOMParser;
var serializer = require('xmldom').XMLSerializer;
var xpath      = require('xpath');

var rootdir    = process.argv[2];

var platforms = (process.env.CORDOVA_PLATFORMS ? process.env.CORDOVA_PLATFORMS.toLowerCase().split(',') : []);

if (platforms.indexOf('android') < 0) {
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

var manifestFile = path.join(rootdir, 'platforms/android/AndroidManifest.xml');
if (fs.existsSync(manifestFile)) {
	var contents = fs.readFileSync(manifestFile, 'utf8');
	var doc = new dom().parseFromString(contents);
	var manifest = doc.documentElement;
	var i;

	var changed = false;

	var found_billing = false;
	var permissions = xpath.select('//uses-permission', doc);
	for (i=0; i < permissions.length; i++) {
		var perm = permissions[i].getAttribute('android:name');
		if (perm === 'com.android.vending.BILLING') {
			//console.log('found billing');
			found_billing = true;
		}
	}

	if (!found_billing) {
		console.log('* adding com.android.vending.BILLING permission');
		var billing = doc.createElement('uses-permission');
		var attr = doc.createAttribute('android:name');
		attr.value = 'com.android.vending.BILLING';
		billing.setAttributeNode(attr);
		manifest.appendChild(billing);
		changed = true;
	}

	var minSdk = parseInt(manifest.getAttribute('android:minSdkVersion'), 10);
	if (minSdk != configobj.minSdk) {
		console.log('* changing minimum SDK from ' + minSdk + ' to ' + configobj.minSdk);
		manifest.setAttribute('android:minSdkVersion', configobj.minSdk);
		changed = true;
	}

	if (changed) {
		console.log('Writing updated AndroidManifest.xml file.');
		var output = new serializer().serializeToString(doc);
		fs.writeFileSync(manifestFile, output, 'utf8');
	}
} else {
	console.log('WARNING: missing ' + manifestFile);
}
