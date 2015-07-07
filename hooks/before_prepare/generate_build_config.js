#!/usr/bin/env node

// this plugin replaces arbitrary text in arbitrary files

var fs = require('fs.extra');
var path = require('path');

var rootdir = process.argv[2];

if (rootdir) {

	var dirs = [
		'www',
	];

	var packagejson = path.join(rootdir, 'package.json');
	var configobj = JSON.parse(fs.readFileSync(packagejson, 'utf8'));

	var buildobj = {};
	var buildjson = path.join(rootdir, 'build-properties.json');
	if (fs.existsSync(buildjson)) {
		buildobj = JSON.parse(fs.readFileSync(buildjson, 'utf8'));
	}
	if (configobj.version) {
		buildobj.version = configobj.version;
	}
	if (!buildobj.build) {
		buildobj.build = configobj.build;
	}

	for (var i=0; i < dirs.length; i++) {
		var dir = dirs[i];
		if (fs.existsSync(dir)) {
			var outfile = path.join(dir, 'scripts/opennms/services/BuildConfig.js');
			fs.writeFileSync(outfile, "(function() {\n\t'use strict';\n\n\tangular.module('opennms.services.BuildConfig', [])\n");
			for (var prop in buildobj) {
				if (buildobj.hasOwnProperty(prop)) {
					// skip signing properties
					if (prop === 'storeFile' || prop === 'keyAlias' || prop === 'storePassword' || prop === 'keyPassword') {
						continue;
					}
					var value = buildobj[prop];
					if (typeof value == 'string' || value instanceof String) {
						fs.appendFileSync(outfile, "\t\t.value('config.build." + prop + "', '" + value + "')\n");
					} else {
						fs.appendFileSync(outfile, "\t\t.value('config.build." + prop + "', " + value + ")\n");
					}
				}
			}
			fs.appendFileSync(outfile, "\t;\n\n}());");
		}
	}

}
