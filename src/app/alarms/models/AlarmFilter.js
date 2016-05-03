'use strict';

var severities = {
	INDETERMINATE: 1,
	CLEARED: 2,
	NORMAL: 3,
	WARNING: 4,
	MINOR: 5,
	MAJOR: 6,
	CRITICAL: 7
};

var Constants = require('../../misc/Constants');

function AlarmFilter(params) {
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

AlarmFilter.prototype.toParams = function(_version) {
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

	var version = _version === undefined? Constants.OPENNMS_UNKNOWN_VERSION : _version;
	if (self.minimumSeverity && version > Constants.OPENNMS_UNKNOWN_VERSION) {
		params.comparator = 'ge';
		params.severity = self.minimumSeverity;
	}
	return params;
};

AlarmFilter.prototype.toQueryString = function(version) {
	var ret = [];
	var params = this.toParams(version);
	for (var param in params) {
		if ({}.hasOwnProperty.call(params, param)) {
			ret.push(param + '=' + encodeURIComponent(params[param]));
		}
	}
	return ret.join('&');
};

AlarmFilter.prototype.clone = function() {
	return new AlarmFilter(this.toJSON());
};

AlarmFilter.prototype.reset = function() {
	var obj = this.clone();
	obj.offset = 0;
	return obj;
};

AlarmFilter.prototype.equals = function(that) {
	var self = this;

	return this.showAcknowledged === that.showAcknowledged
		&& this.newestFirst      === that.newestFirst
		&& this.limit            === that.limit
		&& this.offset           === that.offset
		&& this.minimumSeverity  === that.minimumSeverity;
};

AlarmFilter.prototype.next = function() {
	var cloned = this.clone();
	cloned.offset += cloned.limit;
	return cloned;
};

AlarmFilter.prototype.toJSON = function() {
	return {
		showAcknowledged: this.showAcknowledged,
		newestFirst: this.newestFirst,
		limit: this.limit,
		offset: this.offset,
		minimumSeverity: this.minimumSeverity
	};
};

module.exports = AlarmFilter;