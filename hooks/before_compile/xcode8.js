#!/usr/bin/env node

"use strict";

var fs    = require('fs');
var path  = require('path');

module.exports = function(context) {
    var encoding = 'utf-8';
    var filepath = 'platforms/ios/cordova/build.xcconfig';

    if (context.opts.cordova.platforms.indexOf('ios') === -1) return;
    if (!context.opts.options) return;
    if (!context.opts.options.buildConfig) return;


    var buildType = context.opts.options.release ? 'release' : 'debug';

    var buildConfigPath = context.opts.options.buildConfig;
    if (!path.isAbsolute(buildConfigPath)) {
      buildConfigPath = path.join(context.opts.projectRoot, context.opts.options.buildConfig);
    }
    var config = require(buildConfigPath);


    if (!config.ios) return;
    if (!config.ios[buildType]) return;
    if (!config.ios[buildType].developmentTeam) return;


    var xcconfig = fs.readFileSync(filepath, encoding);

    if (xcconfig.indexOf('DEVELOPMENT_TEAM') === -1) {
        var content = '\nDEVELOPMENT_TEAM = ' + config.ios[buildType].developmentTeam;

        xcconfig += content;
        fs.writeFileSync(filepath, xcconfig, encoding);
    }
};
