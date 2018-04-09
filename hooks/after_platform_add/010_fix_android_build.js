#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var rootdir = process.argv[2];

if (rootdir) {

  var android = path.join('platforms', 'android');
  var outputFile = path.join(android, 'build-extras.gradle');

  if (fs.existsSync(android)) {
    fs.copyFileSync('build-extras.gradle', outputFile);
  }
}
