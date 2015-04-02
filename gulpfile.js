var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var jshint = require('gulp-jshint');
var jasmine = require('gulp-jasmine');
var karma = require('gulp-karma');

var paths = {
  sass: './scss/*.scss',
  sassIncludes: './scss/includes/*.scss',
  opennms: './www/scripts/opennms/**/*.js',
  spec: './spec/*.js'
};

gulp.task('default', ['sass', 'lint', 'test']);

gulp.task('sass', function(done) {
  gulp.src([paths.sass])
    .pipe(sass())
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('lint', function() {
  return gulp.src([paths.opennms, paths.spec])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('watch', function() {
  gulp.watch([paths.sass, paths.sassIncludes], ['sass']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});

var testSource = [
  './www/lib/modernizr/modernizr.js',
  './www/lib/es5-shim/es5-shim.js',
  './www/lib/blob-util/dist/blob-util.min.js',
  './www/lib/jquery/dist/jquery.min.js',
  './www/lib/jquery-visible/jquery.visible.min.js',
  './www/lib/async/lib/async.js',
  './www/lib/angular/angular.min.js',
  './www/lib/angular-animate/angular-animate.min.js',
  './www/lib/angular-cookies/angular-cookies.min.js',
  './www/lib/angular-sanitize/angular-sanitize.min.js',
  './www/lib/angular-ui-router/release/angular-ui-router.min.js',
  './www/lib/angular-mocks/angular-mocks.js',
  './www/lib/ionic/release/js/ionic.min.js',
  './www/lib/ionic/release/js/ionic-angular.min.js',
  './www/lib/angularLocalStorage/src/angularLocalStorage.js',
  './www/lib/angular-queue/angular-queue.js',
  './www/lib/ng-resize/ngresize.min.js',
  './www/lib/ngCordova/dist/ng-cordova-mocks.js',
  './www/lib/momentjs/moment.js',
  paths.opennms,
  paths.spec
];

gulp.task('test', ['lint'], function(done) {
  gulp.src(testSource)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'run'
    }))
    .on('error', function(err) {
      throw err;
    });
});

gulp.task('continuous', function() {
  gulp.src(testSource)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'watch'
    }));
});
