var path = require('path'),
	fs = require('fs'),
	webpack = require('webpack'),
	argv = require('yargs').argv,
	ngAnnotatePlugin = require('ng-annotate-webpack-plugin'),
	copyWebpackPlugin = require('copy-webpack-plugin');

var configfile = path.join(__dirname, 'package.json');
var configobj  = JSON.parse(fs.readFileSync(configfile, 'utf8'));
argv.env = argv.env === 'production'? 'production':'development';

/* eslint-disable no-console */
console.log(configobj.name + ' v' + configobj.version + ' (build ' + configobj.build + ')');
/* eslint-enable no-console */

var outputDirectory = './www';

var plugins = [
	new copyWebpackPlugin([
		{
			context: 'src',
			from: 'index.html',
			to: path.resolve(outputDirectory)
		},
		{
			context: 'src',
			from: 'images/',
			to: path.resolve(outputDirectory, 'images')
		}
	]),
	new webpack.DefinePlugin({
		__DEVELOPMENT__: argv.env === 'development',
		__PRODUCTION__: argv.env === 'production',
		__VERSION__: JSON.stringify(configobj.version),
		__BUILD__: JSON.stringify(configobj.build)
	}),
	new webpack.ResolverPlugin([
		new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin('package.json', ['main']),
		new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin('bower.json', ['main'])
	]),
	new ngAnnotatePlugin({
		add: true
	}),
	new webpack.ProvidePlugin({
		$: 'jquery',
		jQuery: 'jquery',
		'window.jQuery': 'jquery'
	}),
	new webpack.optimize.CommonsChunkPlugin({
		name: 'vendor',
		filename: 'vendor.bundle.js',
		minChunks: Infinity
	}),
	/*
	new webpack.optimize.CommonsChunkPlugin({
		name: 'css',
		filename: 'css.bundle.js',
		minChunks: Infinity
	}),
	*/
	new webpack.optimize.CommonsChunkPlugin({
		children: true,
		async: true
	})
];

if (argv.env !== 'development') {
	plugins.push(new webpack.optimize.OccurenceOrderPlugin(true));
	plugins.push(new webpack.optimize.DedupePlugin());
	plugins.push(new webpack.optimize.UglifyJsPlugin({
		mangle: {
			except: [ '$super', '$', 'jQuery', 'exports', 'require', 'angular', 'ionic' ]
		}
	}));
}

var options = {
	entry: {
		vendor: [
			'angular',
			'angular-animate',
			'angular-cookies',
			'angular-debounce',
			'angular-sanitize',
			'angular-ui-router',
			'angular-uuid4',
			'angularLocalStorage/src/angularLocalStorage',
			'async',
			'classlist',
			'es5-shim',
			'ionic/release/js/ionic',
			'ionic/release/js/ionic-angular',
			'ip-address',
			'jquery',
			'jquery-visible',
			'leaflet/dist/leaflet-src',
			'angular-simple-logger/dist/angular-simple-logger',
			'ui-leaflet/dist/ui-leaflet',
			'moment',
			'ngCordova',
			'urijs',
			'version_compare',
			'winstore-jscompat/winstore-jscompat',
			'x2js/xml2json',
			/* graphing */
			'd3',
			'flot/jquery.flot',
			'flot/jquery.flot.canvas',
			'flot/jquery.flot.pie',
			'./src/3rdparty/jquery.flot.resize',
			'flot/jquery.flot.time',
			'flot-axislabels/jquery.flot.axislabels',
			'flot-legend/jquery.flot.legend',
			'flot.tooltip/js/jquery.flot.tooltip',
			'./src/3rdparty/angular-flot'
		],
		css: [
			'./scss/opennms.scss',
			'./bower_components/onmsicons/scss/onmsicons.scss',
			'style!css!./bower_components/leaflet/dist/leaflet.css'
		],
		app: [
			'./src/app/index'
		]
	},
	output: {
		path: outputDirectory,
		filename: '[name].bundle.js',
		chunkFilename: '[chunkhash].bundle.js'
	},
	resolve: {
		alias: {
			'ionic-filter-bar': 'ionic-filter-bar/dist/ionic.filter.bar',
			'lodash.find': 'lodash',
			'lodash.max': 'lodash'
		},
		root: [
			/*__dirname, */
			/*path.resolve(__dirname, 'bower_components/ionic/release/js'),*/
			path.resolve(__dirname, 'bower_components'),
			path.resolve(__dirname, 'node_modules')
		]
	},
	module: {
		noParse: /lie\.js$|\/leveldown\/|min\.js$/,
		preLoaders: [
		  {
          test: /\.js$/,
          loaders: ['eslint']
        }
      ],
		loaders: [
			{
				test: /\.css$/,
				loader: 'style!css',
				include: [
					path.resolve(__dirname, 'lib/css')
				]
			},
			{
				test: /\.scss$/,
				loaders: ['style', 'css', 'sass']
			},
			{
				test: /\.html$/,
				loader: 'html?config=htmlLoaderConfig'
			},
			{
				test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'url?limit=10000&mimetype=application/vnd.ms-fontobject'
			},
			{
				test: /\.otf(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'url?limit=10000&mimetype=application/x-font-opentype'
			},
			{
				test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'url?limit=10000&mimetype=application/octet-stream'
			},
			{
				test: /\.woff2?(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'url?limit=10000&mimetype=application/font-woff'
			},
			{
				test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'file'
			},
			{
				test: /\.(jpe?g|png|gif)$/i,
				loader: 'file'
			},
			{
				test: /[\/]angular\.js$/,
				loader: 'expose?angular!exports?angular'
			},
			{
				test: /[\/]ionic\.js$/,
				loader: 'expose?ionic!exports?ionic'
			}
		]
	},
	plugins: plugins,
	externals: {
		fs: '{}',
		cordova: '{}',
		jQuery: '{}'
	},
	htmlLoaderConfig: {
		minimize: false
	}
};

if (argv.env === 'development') {
	options.output.pathinfo = true;
	options.devtool = 'eval';
} else {
	options.devtool = 'source-map';
}

module.exports = options;
