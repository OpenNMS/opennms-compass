'use strict';

/* eslint-disable no-extend-native, no-magic-numbers */
if (typeof String.prototype.capitalize !== 'function') {
	String.prototype.capitalize = function capitalize() {
		'use strict';
		return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
	};
}
if (typeof String.prototype.contains !== 'function') {
	String.prototype.contains = function contains(comparator) {
		'use strict';
		return comparator === undefined? true : this.toLowerCase().indexOf(comparator.toLowerCase()) > -1;
	};
}
/* eslint-enable no-extend-native, no-magic-numbers */

var removeSlashes = /^.*\//g;
var capitalLetters = /([A-Z])/g;

export default class StringUtils {
	static formatUei(uei) {
		var ret = uei
		.replace(removeSlashes, '');

		if (ret.contains('_')) {
			ret = ret.replace('_', ' ');
		} else {
			ret = ret.replace(capitalLetters, ' $1');
		}

		return ret.charAt(0).toUpperCase() + ret.slice(1); // eslint-disable-line no-magic-numbers
	}
}
