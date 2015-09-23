#!/usr/bin/env node

var enable_bitcode = false;

var fs = require("fs"),
    path = require("path"),
    shell = require("shelljs"),
    xcode = require('xcode'),
    projectRoot = process.argv[2];

function propReplace(obj, prop, value) {
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      if (typeof obj[p] === 'object') {
        propReplace(obj[p], prop, value);
      } else if (p === prop) {
        obj[p] = value;
      }
    }
  }
}

function setEnableBitcode(xcodeProject, xcodeProjectPath, enable) {
  var buildConfig = xcodeProject.pbxXCBuildConfigurationSection();
  propReplace(buildConfig, 'ENABLE_BITCODE', enable? 'YES':'NO');
  fs.writeFileSync(xcodeProjectPath, xcodeProject.writeSync(), 'utf-8');
}

function getProjectName(protoPath) {
  var cordovaConfigPath = path.join(protoPath, 'config.xml');
  var content = fs.readFileSync(cordovaConfigPath, 'utf-8');

  return /<name>([\s\S]*)<\/name>/mi.exec(content)[1].trim();
}

/*
  This is our runner function. It sets up the project paths, 
  parses the project file using xcode and delegates to our updateDeploymentTarget
  that does the actual work.
*/

function run(projectRoot) {
  var projectName = getProjectName(projectRoot),
      xcodeProjectName = projectName + '.xcodeproj',
      xcodeProjectPath = path.join(projectRoot, 'platforms', 'ios', xcodeProjectName, 'project.pbxproj'),
      xcodeProject;
  
  if(!fs.existsSync(xcodeProjectPath)) { return; }

  xcodeProject = xcode.project(xcodeProjectPath);

  xcodeProject.parse(function(err) {
    if(err) {
      shell.echo('An error occured during parsing of [' + xcodeProjectPath + ']: ' + JSON.stringify(err));
    } else {
      setEnableBitcode(xcodeProject, xcodeProjectPath, enable_bitcode);
    }
  });
}

run(projectRoot);
