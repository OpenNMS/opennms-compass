#!/usr/bin/env node

var exec = require('child_process').exec;

var rootdir = process.argv[2];

if (rootdir) {
  exec('gulp prepare');
}
