/* jshint -W069 */ /* "better written in dot notation" */

var moment = require('moment');

/**
 * @ngdoc object
 * @name OutageSummary
 * @param {Object} data an outage summary JSON object
 * @constructor
 */
function OutageSummary(data) {
  'use strict';

  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name OutageSummary#nodeid
   * @propertyOf OutageSummary
   * @returns {number} Unique integer identifier for node
   */
  self.nodeId = parseInt(data['_node-id'], 10);

  /**
   * @description
   * @ngdoc property
   * @name OutageSummary#nodeLabel
   * @propertyOf OutageSummary
   * @returns {string} The human-readable name of the node of this alarm.
   */
  self.nodeLabel = data['_node-label'];

  /**
   * @description
   * @ngdoc property
   * @name OutageSummary#down
   * @propertyOf OutageSummary
   * @returns {*|Date} The time the outage started.
   */
  self.down = data['_time-down']? moment(data['_time-down']) : undefined;

  /**
   * @description
   * @ngdoc property
   * @name OutageSummary#up
   * @propertyOf OutageSummary
   * @returns {*|Date} The time the outage was resolved.
   */
  self.up = data['_time-up']? moment(data['_time-up']) : undefined;

  /**
   * @description
   * @ngdoc property
   * @name OutageSummary#now
   * @propertyOf OutageSummary
   * @returns {*|Date} The time the outage was retrieved from the server.
   */
  self.now = data['_time-now']? moment(data['_time-now']) : undefined;

  /**
   * @description Helper method to get a friendly node label. It will generate
   *              a node label based on the node ID if the nodeLabel property
   *              is not defined or is empty.
   * @ngdoc method
   * @name Outage#getNodeName
   * @methodOf Outage
   * @returns {string} a formatted node label using the nodeLabel or the nodeId formatted into a string.
   */
  self.getNodeName = function() {
    if (self.nodeLabel === undefined || self.nodeLabel.trim() === '') {
      return 'Node ' + self.nodeId;
    } else {
      return self.nodeLabel;
    }
  };
}

module.exports = OutageSummary;