(function() {
	'use strict';

	/* global describe: true */
	/* global beforeEach: true */
	/* global afterEach: true */
	/* global it: true */
	/* global xit: true */
	/* global expect: true */
	/* global spyOn: true */
	/* global DonutWidget: true */

	describe('DonutWidget', function() {

		var throwOrientationChange = function(orientation) {
			var ev = document.createEvent('Event');
			ev.initEvent('orientationchange', true, true);
			ev.orientation = orientation || 180;
			ev.orientationState = (ev.orientation % 180 === 0)? 'portrait':'landscape';
			var cancelled = !document.dispatchEvent(ev);
			expect(cancelled).toBe(false);
		};

		var widget;

		beforeEach(function() {
			console.log('================================================================================');
		});

		afterEach(function() {
			if (widget) {
				widget.destroy();
				widget = undefined;
			}
		});

		it('should initialize with default pie options', function() {
			widget = new DonutWidget({elementId: 'alarms'});
			expect(widget.pieOptions()).toEqual({
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
					}
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
			});
		});

		it('should initialize with custom pie options', function() {
			widget = new DonutWidget({ elementId: 'alarms', pieOptions: { misc: { colors: { segmentStroke: '#111111' } } } });
			expect(widget.pieOptions().misc.colors.segmentStroke).toBe('#111111');
		});

		it("should throw an error if you don't provide an element ID", function() {
			expect(function() {
				new DonutWidget();
			}).toThrow('No elementId provided!');
		});

		xit("should redraw if we detect an orientation change", function(done) {
			widget = new DonutWidget({elementId:'alarms'});
			widget.dirty = false;
			spyOn(widget, 'redraw').and.callFake(function() { this.dirty = false; });
			setTimeout(function() {
				expect(widget.redraw).toHaveBeenCalled();
				expect(widget.redraw.calls.count()).toEqual(1);
				expect(widget.orientation).toBe(180);
				done();
			}, 50);

			throwOrientationChange();
		});

		xit("should redraw only once if orientation change is fired twice", function(done) {
			widget = new DonutWidget({elementId:'alarms'});
			widget.dirty = false;
			spyOn(widget, 'redraw').and.callFake(function() { this.dirty = false; });
			setTimeout(function() {
				expect(widget.redraw).toHaveBeenCalled();
				expect(widget.redraw.calls.count()).toEqual(1);
				expect(widget.orientation).toBe(90);
				done();
			}, 50);

			throwOrientationChange();
			throwOrientationChange(90);
		});

		it("should redraw if data has changed", function(done) {
			widget = new DonutWidget({elementId:'alarms'});
			widget.dirty = false;
			spyOn(widget, 'redraw').and.callFake(function() { this.dirty = false; });
			setTimeout(function() {
				expect(widget.redraw).toHaveBeenCalled();
				//expect(widget.redraw.calls.count()).toEqual(1);
				done();
			}, 100);

			widget.setData({label: 'blah', value: 1});
		});

		it("should redraw on initialization", function(done) {
			// subclass so we can catch redraw during initialization
			function TestWidget(properties) {
				DonutWidget.call(this, properties);
				this.redrawCount = 0;
			}
			TestWidget.prototype = Object.create(DonutWidget.prototype);
			TestWidget.prototype.redraw = function() {
				this.redrawCount++;
			};

			widget = new TestWidget({elementId:'alarms', pieOptions: {
				data: {
					content: [{
						'label': 'foo',
						'value': 1
					}]
				}
			}});

			// it should redraw upon initialization because it's dirty
			setTimeout(function() {
				expect(widget.redrawCount).toBe(1);
				done();
			}, 50);
		});

		it("should redraw on setData", function(done) {
			widget = new DonutWidget({elementId:'alarms', pieOptions: {
				data: {
					content: [{
						'label': 'foo',
						'value': 1
					}]
				}
			}});
			spyOn(widget, 'redraw').and.callFake(function() { this.dirty = false; });

			// the setData should have triggered a second redraw
			setTimeout(function() {
				expect(widget.redraw).toHaveBeenCalled();
				expect(widget.redraw.calls.count()).toBe(1);
				done();
			}, 50);
		});

		it("should show the data depending if there is a title", function() {
			widget = new DonutWidget({elementId:'alarms'});
			widget.setTitle("7");
			expect(widget.pieOptions().header.title.text).toBe("7");
		});

		it("should format the inner label as 'value' if data exists", function() {
			widget = new DonutWidget({elementId:'alarms'});
			widget.setData([{
				'label': 'bar',
				'value': 2
			}]);
			expect(widget.pieOptions().labels.inner.format).toBe('value');
		});

		it("should format the inner label as 'none' if data does not exist", function() {
			widget = new DonutWidget({elementId:'alarms'});
			widget.setData([]);
			expect(widget.pieOptions().labels.inner.format).toBe('none');
		});
	});
})();