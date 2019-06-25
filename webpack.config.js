/* eslint-disable no-console */

const argv = require('yargs').argv;
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const rootdir = __dirname; // eslint-disable-line no-undef
const srcdir = path.resolve(rootdir, 'src');
const destdir = path.resolve(rootdir, 'www');

var configfile = path.join(__dirname, 'package.json');
var configobj  = JSON.parse(fs.readFileSync(configfile, 'utf8'));
const mode = argv.mode === 'production'? 'production':'development';

console.log(configobj.name + ' v' + configobj.version + ' (' + mode + ' build ' + configobj.build + ')'); // eslint-disable-line no-console

const config = {
	mode: mode,
	entry: {
		styles: [
			'scss/opennms',
			'node_modules/onmsicons/scss/onmsicons',
			'node_modules/leaflet/dist/leaflet'
		],
		jquery: 'expose-loader?jQuery!expose-loader?$!jquery/dist/jquery',
		vendor: [
			'angular',
			'angular-animate',
			'angular-cookies',
			'angular-debounce',
			'angular-sanitize',
			'angular-simple-logger',
			'angular-ui-router',
			'angular-uuid4',
			'angularLocalStorage/src/angularLocalStorage',
			'async',
			/* 'classlist', */
			/* 'es5-shim', */
			'ionic-angular/release/js/ionic',
			'ionic-angular/release/js/ionic-angular',
			'ip-address',
			/* 'jquery', */
			'./src/3rdparty/jquery.visible',
			'leaflet/dist/leaflet-src',
			'ui-leaflet/dist/ui-leaflet',
			'moment',
			'ngCordova',
			'urijs',
			'version_compare',
			'./src/3rdparty/winstore-jscompat',
			'x2js',
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
			'imports-loader?angular!./src/3rdparty/angular-flot'
		],
		app: [
			path.resolve(srcdir, 'app', 'index')
		]
	},
	output: {
		path: destdir,
		filename: '[name].bundle.js',
		chunkFilename: '[chunkhash].bundle.js'
	},
	resolve: {
		modules: [ path.resolve(rootdir, 'node_modules'), srcdir, rootdir ],
		descriptionFiles: ['package.json', 'bower.json'],
		mainFields: ['main', 'browser'],
		mainFiles: ['index'],
		aliasFields: ['browser'],
		extensions: ['.ts', '.js', '.json', '.scss', '.css', '.html'],
		alias: {
			'ionic-filter-bar': 'ionic-filter-bar/dist/ionic.filter.bar',
			'lodash.find': 'lodash',
			'lodash.max': 'lodash',
			'x2js/xml2json': 'x2js'
		}
	},
	plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
		}),
		new CopyPlugin([
			/*
			{
				context: 'node_modules/jquery/dist',
				from: 'jquery.min.js',
				to: path.resolve(destdir, 'jquery.js')
			},
			{
				context: 'node_modules/jquery/dist',
				from: 'jquery.min.map',
				to: path.resolve(destdir, 'jquery.map')
			},
			*/
			{
				context: 'node_modules/d3',
				from: 'd3.min.js',
				to: path.resolve(destdir, 'd3.js')
			},
			{
				context: 'src',
				from: 'index.html',
				to: path.resolve(destdir, 'index.html')
			},
			{
				context: 'src',
				from: 'images/',
				to: path.resolve(destdir, 'images')
			}
		]),
		new webpack.DefinePlugin({
			__DEVELOPMENT__: mode === 'development',
			__PRODUCTION__: mode === 'production',
			__VERSION__: JSON.stringify(configobj.version),
			__BUILD__: JSON.stringify(configobj.build)
		}),
		new HtmlWebpackPlugin({
			inject: 'head',
			template: 'src/index.html'
		})
	],
	module: {
		noParse: /lie\.js$|\/leveldown\/|min\.js$/,
		rules: [
			{
				test: /\.(sa|sc|c)ss$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
						options: {
							hmr: mode === 'development'
						}
					},
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            },
					},
					'sass-loader'
				]
			},
			{
				test: /\.html$/,
				exclude: [ path.resolve(srcdir, 'index.html') ],
				use: [
					'ngtemplate-loader',
					'html-loader'
				]
			},
			{
				test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: 10000,
							mimetype: 'application/vnd.ms-fontobject'
						}
					}
				]
			},
			{
				test: /\.otf(\?v=\d+\.\d+\.\d+)?$/,
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: 10000,
							mimetype: 'application/x-font-opentype'
						}
					}
				]
			},
			{
				test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: 10000,
							mimetype: 'application/octet-stream'
						}
					}
				]
			},
			{
				test: /\.woff2?(\?v=\d+\.\d+\.\d+)?$/,
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: 10000,
							mimetype: 'application/font-woff'
						}
					}
				]
			},
			{
				test: /\.(jpe?g|png|gif|svg)(\?v=\d+\.\d+\.\d+)?$/,
				use: [ 'file-loader' ]
			},
			{
				test: /[/]d3\.js$/,
				use: [
					{
						loader: 'expose-loader',
						options: 'd3'
					},
					{
						loader: 'exports-loader',
						options: 'd3'
					}
				]
			},
			{
				test: /[/]angular\.js$/,
				use: [
					{
						loader: 'expose-loader',
						options: 'angular'
					},
					{
						loader: 'exports-loader',
						options: 'angular'
					}
				]
			},
			{
				test: /[/]ionic\.js$/,
				use: [
					{
						loader: 'expose-loader',
						options: 'ionic'
					},
					{
						loader: 'exports-loader',
						options: 'ionic'
					}
				]
			},
			{
				test: /\.[jt]s$/,
				exclude: /node_modules/,
				loader: 'babel-loader'
			}
		]
	},
	externals: {
		fs: '{}',
		cordova: '{}',
		d3: '{}' /*,
		jQuery: '{}' */
	},
	optimization: {
		minimize: mode === 'production',
		minimizer: [
			new TerserPlugin({
				cache: true,
				parallel: true,
				sourceMap: true,
				terserOptions: {
					mangle: {
						reserved: ['$super', '$', 'jQuery', 'exports', 'require', 'angular', 'ionic', 'ionic-angular']
					}
				}
			})
		] /*,
		runtimeChunk: 'single',
		splitChunks: {
			chunks: 'all',
			maxInitialRequests: Infinity,
			minSize: 0,
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					name(module) {
						let packageName = module.context.match(/[/]node_modules[/](.*?)$/)[1];
						// console.log('context=', module.context);
						// console.log('raw package name=', packageName);
						if (packageName && packageName.startsWith('@')) {
							packageName = packageName.match(/^(@[^/]+\/[^/]+)/)[1];
						} else {
							packageName = packageName.match(/^([^\\/]+)/)[1];
						}
						const moduleName = `npm.${packageName.replace('@', '')}`;
						// console.log('using module name:', moduleName);
						return moduleName;
					}
				}
			}
		}
		*/
	}
};

if (mode === 'development') {
	config.devtool = 'eval';
} else {
	config.devtool = 'source-map';
}

module.exports = config;
