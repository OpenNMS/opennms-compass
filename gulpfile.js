'use strict';

var gulp = require('gulp');
var run = require('gulp-run-command').default;

gulp.task('default', ['sass']);
gulp.task('sass', run('npm run webpack'));

gulp.task('watch', function() {
  exec('npm run watch');
});
