#!/usr/bin/env node

/* eslint-disable no-console */

var fs = require('fs.extra');
var path = require('path');

var rootdir = process.argv[2];

if (rootdir) {
	var androidDir = path.join(rootdir, 'platforms/android');
	if (fs.existsSync(androidDir)) {
		var signingFile = path.join(androidDir, 'release-signing.properties');
		var antFile = path.join(androidDir, 'ant.properties');

		var buildjson = path.join(rootdir, 'build-properties.json');
		var buildobj = JSON.parse(fs.readFileSync(buildjson, 'utf8'));

		if (buildobj.storeFile) {
			var releaseSigningOutput = 'storeFile=' + buildobj.storeFile + '\n';
				releaseSigningOutput += 'keyAlias=' + buildobj.keyAlias + '\n';
				releaseSigningOutput += 'storePassword=' + buildobj.storePassword + '\n';
				releaseSigningOutput += 'keyPassword=' + buildobj.keyPassword + '\n';

			fs.writeFileSync(signingFile, releaseSigningOutput, 'utf8');

			var antSigningOutput = 'key.store=' + buildobj.storeFile + '\n';
				antSigningOutput += 'key.alias=' + buildobj.keyAlias + '\n';
				antSigningOutput += 'key.store.password=' + buildobj.storePassword + '\n';
				antSigningOutput += 'key.alias.password=' + buildobj.keyPassword + '\n';

			fs.writeFileSync(antFile, antSigningOutput, 'utf8');

			console.log('createSigningFile: Configured Android platform for signing.');
		} else {
			console.log('createSigningFile: Android platform is configured but build-properties.json is not configured for signing.');
		}
	}
}

/* eslint-enable no-console */