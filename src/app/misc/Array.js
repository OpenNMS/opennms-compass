/* eslint-disable no-extend-native, no-magic-numbers, no-void */

if (typeof Array.prototype.difference !== 'function') {
	Array.prototype.difference = function(e) {
		'use strict';
		var self = this;
		return self.filter(function(entry) {
			return e.indexOf(entry) === -1;
		}).concat(e.filter(function(entry) {
			return self.indexOf(entry) === -1;
		}));
	};
}

if (typeof Array.prototype.remove !== 'function') {
	Array.prototype.remove = function(e) {
		'use strict';
		var index = this.indexOf(e);
		if (index >= 0) {
			this.splice(index, 1);
		}
		return this;
	}
}

/* eslint-enable no-extend-native, no-magic-numbers, no-void */
