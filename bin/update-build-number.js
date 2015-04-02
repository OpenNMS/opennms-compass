#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var conf = require('../build-properties.json');
var buildNumber = conf['build'];
buildNumber = buildNumber + 1;

conf['build'] = buildNumber;
fs.writeFileSync('./build-properties.json', JSON.stringify(conf, null, '  '), 'utf8');

console.log(buildNumber);
