(function() {
	'use strict';

	/* global async: true */
	/* global d3pie: true */
	/* global ionic: true */

	angular.module('opennms.services.DonutWidget', [
		'ionic',
	])
	.factory('DonutWidget', function($window) {
		function DonutWidget(properties) {
			var self = this;
			self.dirty = true;

			self.properties = this.merge_({}, {heightRatio: 0.8}, properties);
			if (properties) {
				self.properties.pieOptions = this.merge_({}, self.defaultPieOptions, properties.pieOptions);
			} else {
				self.properties.pieOptions = angular.copy(self.defaultPieOptions);
			}

			self.queue = async.queue(function(task, callback) {
				if (task && task.description) {
					//console.log(self.getLogMessage('queue', 'executing ' + task.description));
					task.f();
					setTimeout(callback, 300);
				} else {
					//console.log(self.getLogMessage('queue', 'executing next task'));
					task();
					setTimeout(callback, 300);
				}
			}, 1);
			/*
			self.queue.drain = function() {
				console.log(self.getLogMessage('queue', 'finished all items'));
			};
			*/

			self.handleSizeChange = function(ev) {
				var oldWidth = self.width,
					oldHeight = self.height,
					oldOrientation = self.orientation;

				setTimeout(function() {
					self.refreshSize();
					//console.log(self.getLogMessage('handleSizeChange', oldWidth + 'x' + oldHeight + '(' + oldOrientation + ') -> ' + self.width + 'x' + self.height + '(' + self.orientation + ')'));
					if (self.width !== oldWidth || self.height !== oldHeight || self.orientation !== oldOrientation) {
						if (self.pie) {
							console.log(self.getLogMessage('handleSizeChange', 'Pie already exists, but orientation is changing.  Destroying it.'));
							self.pie.destroy();
							self.pie = undefined;
						}
						self.setDirty('size/orientation has changed (' + oldWidth + 'x' + oldHeight + ' != ' + self.width + 'x' + self.height + ' || ' + oldOrientation + ' != ' + self.orientation + ')');
						self.refresh();
					}
				}, 50);
			};

			self.refresh = function() {
				setTimeout(function() {
					self.queue.push(function() {
						if (self.dirty) {
							self.redraw();
						}
					});
				});
			};

			self.init();
		}

		DonutWidget.prototype.getLogMessage = function(method, text) {
			return 'DonutWidget(' + this.properties.elementId + ').' + method + ': ' + text;
		};

		DonutWidget.prototype.setDirty = function(reason) {
			var self = this;
			console.log(self.getLogMessage('setDirty', reason));
			self.dirty = true;
			if (self.onDirty) {
				var info = {
					width: self.getWidth(),
					height: self.getHeight(),
					landscape: (self.orientation === 'landscape'),
				};
				//console.log(self.getLogMessage('setDirty', 'onDirty info = ' + angular.toJson(info)));
				self.onDirty(info);
			}
		};

		DonutWidget.prototype.refreshSize = function() {
			this.width = angular.element($window).width();
			this.height = angular.element($window).height();
			if (this.width > this.height) {
				this.orientation = 'landscape';
			} else {
				this.orientation = 'portrait';
			}
			// console.log(this.getLogMessage('refreshSize', 'size=' + this.width + 'x' + this.height + ', orientation=' + this.orientation));
		};

		DonutWidget.prototype.init = function() {
			this.assertValid();
			this.refreshSize();
			window.addEventListener("orientationchange", this.handleSizeChange, true);
			window.addEventListener("resize", this.handleSizeChange, true);
			this.refresh();
		};

		DonutWidget.prototype.destroy = function() {
			if (this.queue) {
			 	this.queue.kill();
			}
			if (this.pie && this.pie.destroy) {
				this.pie.destroy();
			}
			window.removeEventListener('orientationchange', this.handleSizeChange, true);
			window.removeEventListener("resize", this.handleSizeChange, true);
		};

		DonutWidget.prototype.assertValid = function() {
			if (!this.properties.elementId) {
				throw "No elementId provided!";
			}
		};

		DonutWidget.prototype.setData = function(data) {
			var self = this;

			if (data && angular.isArray(data) && data.length > 0) {
				self.pieOptions().labels.inner.format = 'value';
			} else {
				self.pieOptions().labels.inner.format = 'none';
			}

			//console.log(self.getLogMessage('setData', 'inner.format=' + self.pieOptions().labels.inner.format));
			var oldData = angular.toJson(self.pieOptions().data.content) || "";
			var newData = angular.toJson(data);
			//console.log(self.getLogMellage('setData: oldData: ' + oldData));
			//console.log(self.getLogMessage('setData', 'newData: ' + newData));
			if (oldData.indexOf(newData) !== 0 || newData.indexOf(oldData) !== 0) {
				self.pieOptions().data.content = data;
				self.setDirty('data was changed');
				//console.log(self.getLogMessage('setData', 'old data: ' + angular.toJson(self.pieOptions().data.content)));
				//console.log(self.getLogMessage('setData', 'new data: ' + angular.toJson(data)));
				self.refresh();
			}
		};

		DonutWidget.prototype.setTitle = function(title) {
			var self = this;
			title = ''+title;
			if (title !== self.pieOptions().header.title.text) {
				self.pieOptions().header.title.text = title;
				self.setDirty('title was changed');
				self.refresh();
			}
		};

		DonutWidget.prototype.getWidth = function() {
			if (this.orientation === 'landscape') {
				return Math.round(this.width / 2);
			} else {
				return this.width;
			}
		};

		DonutWidget.prototype.getHeight = function() {
			if (this.orientation === 'landscape') {
				return Math.round(this.width / 2 * this.properties.heightRatio);
			} else {
				return Math.round(this.width * this.properties.heightRatio);
			}
		};

		DonutWidget.prototype.redraw = function redraw() {
			var self = this;

			var elementId = self.properties.elementId;
			var orientation = self.orientation;
			var elementName = elementId + '-' + orientation;

			var width = self.getWidth();
			var height = self.getHeight();

			//console.log(self.getLogMessage('redraw', 'redrawing pie'));
			var element = angular.element('#' + elementName);
			if (element && element.length) {
				var options = self.merge_({}, self.pieOptions());
				self.dirty = false;
				options.size.canvasWidth = width;
				options.size.canvasHeight = height;

				if (angular.isUndefined(options.data.content) || !options.data.content) {
					console.log(self.getLogMessage('redraw', 'Data not initialized.  Skipping redraw.'));
					return;
				}

				if (self.onRedraw) {
					self.onRedraw({
						landscape: (self.orientation === 'landscape'),
						width: options.size.canvasWidth,
						height: options.size.canvasHeight
					});
				}

				element.width(options.size.canvasWidth);
				element.height(options.size.canvasHeight);
				//console.log(self.getLogMessage('redraw', 'size is ' + options.size.canvasWidth + 'x' + options.size.canvasHeight));

				if (angular.isArray(options.data.content) && options.data.content.length > 0) {
					options.labels.inner.format = 'value';
				} else {
					options.labels.inner.format = 'none';
					options.data.content = [{
						'label': '',
						'value': 1,
						'color': 'green'
					}];
				}

				//console.log(self.getLogMessage('redraw', 'element is visible'));
				if (self.pie) {
					console.log(self.getLogMessage('redraw', 'pie exists, redrawing'));
					self.merge_(self.pie.options, options);
					self.pie.options.data.content = options.data.content;
					//console.log('pie.options='+angular.toJson(self.pie.options));
					self.pie.destroy();
					self.pie.recreate();
				} else {
					/*jshint -W055 */
					console.log(self.getLogMessage('redraw', 'pie does not exist'));
					//console.log('options='+angular.toJson(options));
					self.pie = new d3pie(elementId + '-' + orientation, options);
				}
			} else {
				console.log(self.getLogMessage('redraw', 'element does not exist, staying dirty'));
			}
		};

		DonutWidget.prototype.defaultPieOptions = {
			"header": {
				"title": {
					"text": "0",
					"color": "black",
					"fontSize": 14
				},
				"location": "pie-center"
			},
			"size": {
				"canvasWidth": 590,
				"pieInnerRadius": "50%",
				"pieOuterRadius": "66%"
			},
			"data": {
				"sortOrder": "label-desc",
				"smallSegmentGrouping": {
					"enabled": false
				},
				/* "content": [] */
			},
			"labels": {
				"outer": {
					"format": "label",
					"pieDistance": 30
				},
				"inner": {
					"format": "value"
				},
				"mainLabel": {
					"fontSize": 11
				},
				"percentage": {
					"color": "#999999",
					"fontSize": 11,
					"decimalPlaces": 0
				},
				"value": {
					"color": "white",
					"fontSize": 11
				},
				"lines": {
					"enabled": true,
					"style": "straight",
					"color": "#777777"
				}
			},
			"effects": {
				"load": {
					"speed": 300
				},
				"pullOutSegmentOnClick": {
					"effect": "none"
				}
			},
			"misc": {
				"colors": {
					"segmentStroke": "#000000"
				},
				"canvasPadding": {
					"top": 0,
					"right": 0,
					"bottom": 10,
					"left": 0
				}
			},
			"callbacks": {}
		};

		DonutWidget.prototype.pieOptions = function() {
			return this.properties.pieOptions;
		};

		DonutWidget.prototype.baseExtend_ = function baseExtend(dst, objs, deep) {
		  var h = dst.$$hashKey;

		  for (var i = 0, ii = objs.length; i < ii; ++i) {
		    var obj = objs[i];
		    if (!angular.isObject(obj) && !angular.isFunction(obj)) {
		    	continue;
		    }
		    var keys = Object.keys(obj);
		    for (var j = 0, jj = keys.length; j < jj; j++) {
		      var key = keys[j];
		      var src = obj[key];

		      if (deep && angular.isObject(src)) {
		        if (!angular.isObject(dst[key])) {
		        	dst[key] = angular.isArray(src) ? [] : {};
		        }
		        baseExtend(dst[key], [src], true);
		      } else {
		        dst[key] = src;
		      }
		    }
		  }

		  if (h) {
		    dst.$$hashKey = h;
		  } else {
		    delete dst.$$hashKey;
		  }
		  return dst;
		};

		DonutWidget.prototype.merge_ = function merge(dst) {
			return this.baseExtend_(dst, [].slice.call(arguments, 1), true);
		};

		return DonutWidget;
	});
}());
