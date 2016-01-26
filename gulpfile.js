var gulp = require('gulp');
var gutil = require('gulp-util');
var fs = require('fs');
var merge = require('merge2');
var path = require('path');
var sh = require('shelljs');

var bower = require('bower');
var concat = require('gulp-concat');
var ignore = require('gulp-ignore');
var jasmine = require('gulp-jasmine');
var jshint = require('gulp-jshint');
var karma = require('gulp-karma');
var minifyCss = require('gulp-minify-css');
var ngAnnotate = require('gulp-ng-annotate');
var rename = require('gulp-rename');
var rev = require('gulp-rev');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var usemin = require('gulp-usemin');

require('gulp-changelog-release')(gulp);

var paths = {
	bower: './bower_components/**/*',
	src: './src/**/*',
	sass: './scss/*.scss',
	sassIncludes: './scss/includes/*.scss',
	templates: './src/templates/**/*.html',
	opennms: './src/scripts/opennms/**/*.js',
	spec: './spec/*.js',
	excludes: [],
};

var cordovaIgnore = fs.readFileSync('.cordovaignore', 'utf8').split(/\r?\n/);
for (var i=0; i < cordovaIgnore.length; i++) {
	var line = cordovaIgnore[i];
	if (line !== '') {
		line = path.resolve('./bower_components/' + line);
		//console.log('line = ' + line);
		paths.excludes.push(line);
	}
}

gulp.task('default', ['process', 'lint', 'test']);

gulp.task('process', ['process-bower', 'sass', 'process-src']);

gulp.task('process-bower', function(done) {
	gulp.src([paths.bower])
		.pipe(ignore.exclude(paths.excludes))
		.pipe(gulp.dest('./www/lib/'))
		.on('end', done);
});

gulp.task('process-src', function(done) {
	gulp.src([paths.src])
		.pipe(gulp.dest('./www/'))
		.on('end', done);
});

gulp.task('sass', function(done) {
	gulp.src([paths.sass])
		.pipe(sass({errLogToConsole:true}))
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

gulp.task('watch-bower', function() {
	return gulp.watch([paths.bower], ['process-bower']);
});
gulp.task('watch-sass', function() {
	return gulp.watch([paths.sass], ['sass']);
});
gulp.task('watch-opennms', function() {
	return gulp.watch([paths.opennms, paths.templates], ['process-src']);
});
gulp.task('watch', ['watch-bower', 'watch-sass', 'watch-opennms']);

var minifyMe = function() {
	return gulp.src('www/index.html')
		.pipe(usemin({
			angular: [ngAnnotate(), uglify(), rev()],
			backshift: [uglify({mangle:false}), rev()],
			charts: [uglify(), rev()],
			db: [uglify(), rev()],
			flot: [ngAnnotate(), uglify(), rev()],
			ipv6: [uglify(), rev()],
			maps: [uglify(), rev()],
			models: [uglify(), rev()],
			opennms: [ngAnnotate(), uglify(), rev()],
			shim: [uglify(), rev()],
			thirdparty: [uglify(), rev()],
		}));
};

gulp.task('prepare', ['process', 'lint']);

gulp.task('minify', ['prepare'], function() {
	var prep = minifyMe();

	if (fs.existsSync('platforms/android/assets/www')) {
		prep = prep.pipe(gulp.dest('platforms/android/assets/www'));
	}
	if (fs.existsSync('platforms/ios/www')) {
		prep = prep.pipe(gulp.dest('platforms/ios/www'));
	}

	return prep;
});

gulp.task('minify-android', ['minify'], function() {
	return minifyMe().pipe(gulp.dest('platforms/android/assets/www'));
});

gulp.task('minify-ios', ['minify'], function() {
	return minifyMe().pipe(gulp.dest('platforms/ios/www'));
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
			'	' + gutil.colors.red('Git is not installed.'),
			'\n	Git, the version control system, is required to download Ionic.',
			'\n	Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
			'\n	Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
		);
		process.exit(1);
	}
	done();
});

var testSource = [
	'./bower_components/es5-shim/es5-shim.js',
	'./bower_components/blob-util/dist/blob-util.min.js',
	'./bower_components/jquery/dist/jquery.min.js',
	'./bower_components/jquery-visible/jquery.visible.min.js',
	'./bower_components/async/lib/async.js',
	'./bower_components/version_compare/version_compare.js',
	'./bower_components/x2js/xml2json.js',
	'./bower_components/angular/angular.min.js',
	'./bower_components/angular-animate/angular-animate.min.js',
	'./bower_components/angular-cookies/angular-cookies.min.js',
	'./bower_components/angular-sanitize/angular-sanitize.min.js',
	'./bower_components/angular-ui-router/release/angular-ui-router.min.js',
	'./bower_components/angular-mocks/angular-mocks.js',
	'./bower_components/ionic/release/js/ionic.min.js',
	'./bower_components/ionic/release/js/ionic-angular.min.js',
	'./bower_components/angular-uuid4/angular-uuid4.js',
	'./bower_components/angularLocalStorage/src/angularLocalStorage.js',
	'./bower_components/angular-queue/angular-queue.js',
	'./bower_components/ng-resize/ngresize.min.js',
	'./bower_components/ngCordova/dist/ng-cordova-mocks.js',
	'./bower_components/moment/moment.js',
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

