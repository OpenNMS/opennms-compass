/* jshint -W069 */ /* "better written in dot notation" */

var AvailabilityIpInterface = require('./AvailabilityIpInterface'),
  moment = require('moment');

/**
 * @ngdoc object
 * @name AvailabilityNode
 * @param {Object} node Availability node as JSON object
 * @constructor
 */
function AvailabilityNode(node) {
  'use strict';

  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityNode#id
   * @propertyOf AvailabilityNode
   * @returns {number} Node ID
   */
  self.id   = Number(node['_id']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityNode#availability
   * @propertyOf AvailabilityNode
   * @returns {number} Node's availability (as a percentage)
   */
  self.availability = parseFloat(node['_availability']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityNode#serviceCount
   * @propertyOf AvailabilityNode
   * @returns {number} The number of services on the node.
   */
  self.serviceCount = parseInt(node['_service-count'], 10);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityNode#serviceDownCount
   * @propertyOf AvailabilityNode
   * @returns {number} The number of down services on the node.
   */
  self.serviceDownCount = parseInt(node['_service-down-count'], 10);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityNode#ipinterfaces
   * @propertyOf AvailabilityNode
   * @returns {array} An array of AvailabilityIpInterface objects.
   */
  self.ipinterfaces = [];
  if (node.ipinterfaces && node.ipinterfaces.ipinterface) {
    if (!angular.isArray(node.ipinterfaces.ipinterface)) {
      node.ipinterfaces.ipinterface = [node.ipinterfaces.ipinterface];
    }
    for (var i=0, len=node.ipinterfaces.ipinterface.length; i < len; i++) {
      self.ipinterfaces.push(new AvailabilityIpInterface(node.ipinterfaces.ipinterface[i]));
    }
  }

}

module.exports = AvailabilityNode;