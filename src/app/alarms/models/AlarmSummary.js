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
  self.nodeId    = data['node-id'];

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#nodeLabel
   * @propertyOf AlarmSummary
   * @returns {string} The human-readable name of the node of this alarm.
   */
  self.nodeLabel = data['node-label'];

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#severity
   * @propertyOf AlarmSummary
   * @returns {string} Severity the of alarm.
   */
  self.severity  = data.severity;

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#date
   * @propertyOf AlarmSummary
   * @returns {*|Date} The last time an event affected alarms for the summary node.
   */
  self.date      = moment(data.date);

  /**
   * @description
   * @ngdoc property
   * @name AlarmSummary#count
   * @propertyOf AlarmSummary
   * @returns {number} The number of alarms affecting the summary node.
   */
  self.count     = parseInt(data.count, 10);
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
    'node-label': this.nodeLabel,
    severity: this.severity,
    date: this.date,
    count: this.count
  };
};

module.exports = AlarmSummary;
