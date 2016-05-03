/* global moment: true */
/* jshint -W069 */ /* "better written in dot notation" */

var moment = require('moment');

/**
 * @ngdoc object
 * @name AlarmSummary
 * @param {object} data alarm summary JSON data.
 * @constructor
 */
function AlarmSummary(data) {
  'use strict';

  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#nodeid
   * @propertyOf AlarmSummary
   * @returns {number} Unique integer identifier for node
   */
  self.nodeId    = data['_node-id'];

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#nodeLabel
   * @propertyOf AlarmSummary
   * @returns {string} The human-readable name of the node of this alarm.
   */
  self.nodeLabel = data['_node-label'];

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#severity
   * @propertyOf AlarmSummary
   * @returns {string} Severity the of alarm.
   */
  self.severity  = data._severity;

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#date
   * @propertyOf AlarmSummary
   * @returns {*|Date} The last time an event affected alarms for the summary node.
   */
  self.date      = moment(data._date);

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#count
   * @propertyOf AlarmSummary
   * @returns {number} The number of alarms affecting the summary node.
   */
  self.count     = parseInt(data._count, 10);
}

/**
 * @description Helper method to get a friendly node label. It will generate
 *              a node label based on the node ID if the nodeLabel property
 *              is not defined or is empty.
 * @ngdoc method
 * @name AlarmSummary#getNodeName
 * @methodOf AlarmSummary
 * @returns {string} a formatted node label using the nodeLabel or the nodeId formatted into a string.
 */
AlarmSummary.prototype.getNodeName = function() {
  if (this.nodeLabel === undefined || this.nodeLabel === '') {
    return 'Node ' + this.nodeId;
  }

  return this.nodeLabel;
};

AlarmSummary.prototype.toJSON = function() {
  return {
    '_node-label': this.nodeLabel,
    _severity: this.severity,
    _date: this.date,
    _count: this.count
  };
};

module.exports = AlarmSummary;
