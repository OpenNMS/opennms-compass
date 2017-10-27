var path = require('path'),
	fs = require('fs'),
	webpack = require('webpack'),
	argv = require('yargs').argv,
	ngAnnotatePlugin = require('ng-annotate-webpack-plugin'),
	CopyWebpackPlugin = require('copy-webpack-plugin'),
	ExtractTextPlugin = require('extract-text-webpack-plugin');

var configfile = path.join(__dirname, 'package.json');
var configobj  = JSON.parse(fs.readFileSync(configfile, 'utf8'));
argv.env = argv.env === 'production'? 'production':'development';

/* eslint-disable no-console */
console.log(configobj.name + ' v' + configobj.version + ' (build ' + configobj.build + ')');
/* eslint-enable no-console */

var outputDirectory = './www';

var extractCSS = new ExtractTextPlugin('[name].css');

var plugins = [
	new CopyWebpackPlugin([
		{
			context: 'src',
			from: 'index.html',
			to: path.resolve(outputDirectory)
		},
		{
			context: 'node_modules/jquery',
			from: 'dist/',
			to: path.resolve(outputDirectory, 'jquery')
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
	new ngAnnotatePlugin({
		add: true
	}),
	/*
	new webpack.ProvidePlugin({
		$: 'jquery',
		jQuery: 'jquery',
		'window.jQuery': 'jquery'
	}),
	*/
	extractCSS,
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
			except: [ '$super', '$', 'jQuery', 'exports', 'require', 'angular', 'ionic', 'ionic-angular' ]
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
			'ionic-angular/release/js/ionic',
			'ionic-angular/release/js/ionic-angular',
			'ip-address',
			/* 'jquery', */
			'./src/3rdparty/jquery.visible',
			'leaflet/dist/leaflet-src',
			'angular-simple-logger',
			'ui-leaflet/dist/ui-leaflet',
			'moment',
			'ngCordova',
			'urijs',
			'version_compare',
			'./src/3rdparty/winstore-jscompat',
			'x2js/xml2json',
			/* graphing */
			'd3',
			'flot/jquery.flot',
			'flot/jquery.flot.canvas',
			'flot/jquery.flot.pie',
			'./src/3rdparty/jquery.flot.resize',
			'flot/jquery.flot.time',
			'./src/3rdparty/jquery.flot.axislabels',
			'flot-legend/jquery.flot.legend',
			'flot.tooltip/js/jquery.flot.tooltip',
			'imports?angular!./src/3rdparty/angular-flot'
		],
		css: [
			'./scss/opennms.scss',
			'./node_modules/onmsicons/scss/onmsicons.scss',
			'style!css!./node_modules/leaflet/dist/leaflet.css'
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
		modules: [ 'node_modules' ],
		modulesDirectories: [ 'node_modules', 'src', '.' ],
		descriptionFiles: ['package.json', 'bower.json'],
		mainFields: ['main', 'browser'],
		mainFiles: ['index'],
		aliasFields: ['browser'],
		extensions: ['', '.js', '.json', '.scss', '.css'],
		/*moduleExtensions: ['-loader'],
		enforceModuleExtension: false,*/
		alias: {
			'ionic-filter-bar': 'ionic-filter-bar/dist/ionic.filter.bar',
			'lodash.find': 'lodash',
			'lodash.max': 'lodash'
		}
	},
	module: {
		noParse: /lie\.js$|\/leveldown\/|min\.js$/,
		rules: [
		  {
          enforce: 'pre',
          test: /\.js$/,
          loaders: ['eslint'],
          exclude: /node_modules/
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
				/*loader: extractCSS.extract('css', 'sass')*/
				/*
				loader: ExtractTextPlugin.extract({
					fallbackLoader: 'style',
					loader: 'css?minifier!group-css-media-queries!sass'
				})
				*/
				loaders: ['style', 'css?minifier', 'group-css-media-queries', 'sass']
			},
			{
				test: /\.html$/,
				loader: 'html'
				/* loader: 'html?config=htmlLoaderConfig' */
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
			/*
			{
				test: /jquery\.js$/,
				loader: 'expose?jQuery!expose?$'
			},
			*/
			{
				test: /[/]angular\.js$/,
				loader: 'expose?angular!exports?angular'
			},
			{
				test: /[/]ionic\.js$/,
				loader: 'expose?ionic!exports?ionic'
			}
		]
	},
	plugins: plugins,
	externals: {
		fs: '{}',
		cordova: '{}',
		jQuery: '{}'
	} /*,
	htmlLoaderConfig: {
		minimize: false
	}
	*/
};

if (argv.env === 'development') {
	options.output.pathinfo = true;
	options.devtool = 'eval';
} else {
	options.devtool = 'source-map';
}

module.exports = options;
