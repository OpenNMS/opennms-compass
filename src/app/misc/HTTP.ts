'use strict';

declare const angular: any;

import { API, Client, Rest } from 'opennms';

const AxiosHTTP = Rest.AxiosHTTP;
const IonicNativeHTTP = Rest.IonicNativeHTTP;

require('Base64');
require('./Queue');

const validTimeout = function validTimeout(t: any) {
	return angular.isDefined(t) && angular.isNumber(t) && isFinite(t);
};

const module = angular.module('opennms.util.HTTP', [
	'ng',
	'opennms.misc.Queue',
	'opennms.services.Servers',
	'opennms.services.Util'
]);

const defaultOptions = {
	cache: false,
	withCredentials: true,
	headers: {
		accept: 'application/xml'
	}
};

export class HTTP {
	private enableCachebusting: boolean = false;
	private httpImpl?: API.IOnmsHTTP;
	private onmsServer?: API.OnmsServer;
	private lastTimeout?: number;

	private _timeout?: number;

	/* ngInject */
	constructor(private $log: any, server?: any) {
		this.onmsServer = HTTP.getOnmsServer(server);
	}

	public get timeout() {
		return this._timeout || API.OnmsHTTPOptions.DEFAULT_TIMEOUT;
	}

	public set timeout(newTimeout: number) {
		if (validTimeout(newTimeout)) {
			if (newTimeout !== this.lastTimeout) {
				this.lastTimeout = this.timeout;
				this._timeout = newTimeout;
				if (this.httpImpl && this.httpImpl.options) {
					this.httpImpl.options.timeout = newTimeout;
				}
			}
		} else {
			this.$log.warn('HTTP.setTimeout: new timeout is not a number: ' + newTimeout);
		}
	}

	private static getOnmsServer(server: any) {
		if (server) {
			return new API.OnmsServer(server.name, server.url, server.username, server.password);
		}
		return undefined;
	}

	private getImpl() {
		if (!this.httpImpl) {
				if (IonicNativeHTTP.isAvailable()) {
				this.$log.info('HTTP: Ionic Native HTTP is available.');
				this.httpImpl = new IonicNativeHTTP(this.onmsServer, this.timeout);
			} else {
				this.$log.info('HTTP: Ionic Native HTTP is NOT available, falling back to Axios HTTP implementation.');
				this.httpImpl = new AxiosHTTP(this.onmsServer, undefined, this.timeout);
			}
		}

		if (this.onmsServer) {
			this.httpImpl.server = this.onmsServer;
		}

		console.log('getImpl():', this.httpImpl);
		return this.httpImpl;
	};

	private initializeOptions(passedOptions: any) {
		const options = angular.merge({}, defaultOptions, passedOptions);

		if (!options.url.startsWith('http')) {
			throw new Error(options.url + ' is not a valid URL!');
		}
		if (!options.params) {
			options.params = {};
		}
		if (options.method === 'GET' && this.enableCachebusting) {
			options.params._x = new Date().getTime();
		}
		if (options.params.cache) {
			// disable cachebusting for this request
			options.cache = true;
			delete options.params._x;
			delete options.params.cache;
		}
		options.transformResponse = [];

		if (options.headers) {
			if (options.headers.Accept) {
				options.headers.accept = options.headers.Accept;
				delete options.headers.Accept;
			}
			if (options.headers['Content-Type']) {
				options.headers['content-type'] = options.headers['Content-Type'];
				delete options.headers['Content-Type'];
			}
			if (options.headers['Content-type']) {
				options.headers['content-type'] = options.headers['Content-type'];
				delete options.headers['Content-type'];
			}
		}

		return options;
	}

	public setServer(server: any) {
		const onmsServer = server ? HTTP.getOnmsServer(server) : null;
		if (!this.onmsServer || !this.onmsServer.equals(onmsServer)) {
			this.$log.debug('HTTP: server has changed: old=' + JSON.stringify(this.onmsServer));
			this.$log.debug('HTTP: server has changed: new=' + JSON.stringify(onmsServer));
			this.onmsServer = onmsServer;
			this.timeout = server.getTimeoutMS();

			if (this.httpImpl) {
				this.httpImpl.onmsServer = onmsServer;
			}
		}
	}

	public async getClient() {
		const http = this.getImpl();
		return new Client(http.server, http);
	}

	public async call(passedOptions: any) {
		console.log('HTTP.call:', passedOptions);
		const options = this.initializeOptions(passedOptions);
		console.log('HTTP.call: options=', options);
		const http = this.getImpl();
		console.log('HTTP.call: http=', http);

		if (!http) {
			return Promise.reject('Unable to retrieve an HTTP implementation.');
		}

		const handleSuccess = (response: any) => {
			this.$log.info('HTTP.handleSuccess: ' + options.url + ':', response);
			return response;
		};
		const handleError = async (err: any) => {
			this.$log.error('HTTP.handleError: ' + options.url + ':', err);
			throw err;
		};

		if (options.method === 'GET') {
			return http.get(options.url, options as API.OnmsHTTPOptions).then(handleSuccess, handleError);
		} else if (options.method === 'HEAD') {
			return http.head(options.url, options as API.OnmsHTTPOptions).then(handleSuccess, handleError);
		} else if (options.method === 'PUT') {
			options.params = angular.extend({}, options.data, options.params);
			return http.put(options.url, options as API.OnmsHTTPOptions).then(handleSuccess, handleError);
		} else if (options.method === 'POST') {
			options.params = angular.extend({}, options.data, options.params);
			return http.post(options.url, options as API.OnmsHTTPOptions).then(handleSuccess, handleError);
		} else if (options.method === 'DELETE') {
			return http.httpDelete(options.url, options as API.OnmsHTTPOptions).then(handleSuccess, handleError);
		}
	}

}

module.factory('HTTP', function($rootScope: any, $q: any, $log: any, Servers: any, util: any) {
	const http = new HTTP($log, undefined);

	const call = async function(passedOptions: any, server?: any) {
		let sq = $q.when(server);
		if (!server) {
			sq = Servers.getDefault();
		}
		return sq.then((s) => {
			http.setServer(s);
			const deferred = $q.defer();
			http.call(passedOptions).then((response) => {
				$rootScope.$evalAsync(() => {
					deferred.resolve(response);
				});
			}, (err) => {
				$rootScope.$evalAsync(() => {
					// console.log('failed :(', err);
					deferred.reject(err);
				});
			});
			return deferred.promise;
		});
	};

	const get = (url: string, _options: any) => {
		const options = _options || {};
		options.method = 'GET';
		options.url = url;
		return call(options);
	};

	const del = (url: string, _options: any) => {
		const options = _options || {};
		options.method = 'DELETE';
		options.url = url;
		return call(options);
	};

	const post = (url: string, _options: any) => {
		const options = _options || {};
		options.method = 'POST';
		options.url = url;
		return call(options);
	};

	const put = (url: string, _options: any) => {
		const options = _options || {};
		options.method = 'PUT';
		options.url = url;
		return call(options);
	};

	util.onDefaultServerUpdated((newServer: any) => {
		console.log('HTTP: default server changed:', newServer);
		http.setServer(newServer);
	});

	util.onTimeoutUpdated((newTimeout: number) => {
		http.timeout = newTimeout;
	});

	return {
		get: get,
		del: del,
		post: post,
		put: put,
		call: call,
		client: http.getClient,
	};
});
