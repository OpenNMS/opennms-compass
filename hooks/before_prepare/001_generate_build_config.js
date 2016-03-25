#!/usr/bin/env node

// this plugin replaces arbitrary text in arbitrary files

/* eslint-disable quotes */

var fs = require('fs.extra');
var path = require('path');
var exec = require('child_process').execSync;

var rootdir = process.argv[2];

if (rootdir) {

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
	/*
	if (process.env['CORDOVA_CMDLINE'] && process.env['CORDOVA_CMDLINE'].indexOf('--release') >= 0) {
		buildobj.debug = false;
	} else {
		buildobj.debug = true;
	}
	*/

	var dir = 'generated';
	var outfile = path.join(dir, 'misc/BuildConfig.js');
	var outdir = path.dirname(outfile);
	fs.mkdirsSync(outdir);
	fs.writeFileSync(outfile, "(function() {\n\t'use strict';\n\n\tangular.module('opennms.services.BuildConfig', [])\n");
	for (var prop in buildobj) {
		if (buildobj.hasOwnProperty(prop)) {
			// skip signing properties
			if (prop === 'storeFile' || prop === 'keyAlias' || prop === 'storePassword' || prop === 'keyPassword') {
				continue;
			}
			var value = buildobj[prop];
			if (typeof value === 'string' || value instanceof String) {
				fs.appendFileSync(outfile, "\t\t.constant('config.build." + prop + "', '" + value + "')\n");
			} else {
				fs.appendFileSync(outfile, "\t\t.constant('config.build." + prop + "', " + value + ")\n");
			}
		}
	}
	fs.appendFileSync(outfile, "\t;\n\n}());");
}

/* eslint-enable quotes */
