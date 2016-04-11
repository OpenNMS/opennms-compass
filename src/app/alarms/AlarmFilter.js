/* jshint -W069 */ /* "better written in dot notation" */

var severities = {
	INDETERMINATE: 1,
	CLEARED: 2,
	NORMAL: 3,
	WARNING: 4,
	MINOR: 5,
	MAJOR: 6,
	CRITICAL: 7
};

function AlarmFilter(params) {
	'use strict';

	var self = this;

	self.showAcknowledged = false;
	self.newestFirst = true;
	self.limit = 20;
	self.offset = 0;
	self.minimumSeverity = undefined;

	if (params) {
		if (params.hasOwnProperty('showAcknowledged')) {
			self.showAcknowledged = params.showAcknowledged;
		}
		if (params.hasOwnProperty('newestFirst')) {
			self.newestFirst = params.newestFirst;
		}
		if (params.hasOwnProperty('limit')) {
			self.limit = params.limit;
		}
		if (params.hasOwnProperty('offset')) {
			self.offset = params.offset;
		}
		if (params.hasOwnProperty('minimumSeverity') && params.minimumSeverity) {
			self.minimumSeverity = params.minimumSeverity.toUpperCase();
		}
	}
}

AlarmFilter.prototype.toParams = function(version) {
	'use strict';
	var self = this;
	var params = {};
	if (!self.showAcknowledged) {
		params.alarmAckUser = 'null';
	}
	params.orderBy = 'lastEventTime';
	if (self.newestFirst) {
		params.order = 'desc';
	} else {
		params.order = 'asc';
	}
	params.limit = self.limit;
	params.offset = self.offset;
	if (self.minimumSeverity && version > 0.0) {
		params.comparator = 'ge';
		params.severity = self.minimumSeverity;
	}
	return params;
};

AlarmFilter.prototype.clone = function() {
	'use strict';
	var self = this;
	var cloned = new AlarmFilter();
	cloned.showAcknowledged = self.showAcknowledged;
	cloned.newestFirst = self.newestFirst;
	cloned.limit = self.limit;
	cloned.offset = self.offset;
	return cloned;
};

AlarmFilter.prototype.reset = function() {
	'use strict';
	var obj = this.clone();
	obj.offset = 0;
	return obj;
};

AlarmFilter.prototype.equals = function(that) {
	'use strict';
	var self = this;

	return this.showAcknowledged === that.showAcknowledged
		&& this.newestFirst      === that.newestFirst
		&& this.limit            === that.limit
		&& this.offset           === that.offset
		&& this.minimumSeverity  === that.minimumSeverity;
};

AlarmFilter.prototype.next = function() {
	'use strict';
	var cloned = this.clone();
	cloned.offset += cloned.limit;
	return cloned;
};

module.exports = AlarmFilter;