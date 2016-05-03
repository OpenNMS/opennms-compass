'use strict';

var AvailabilityIpInterface = require('./AvailabilityIpInterface'),
  md5 = require('js-md5'),
  moment = require('moment');

/**
 * @ngdoc object
 * @name AvailabilityNode
 * @param {Object} node Availability node as JSON object
 * @constructor
 */
function AvailabilityNode(node) {
  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityNode#id
   * @propertyOf AvailabilityNode
   * @returns {number} Node ID
   */
  self.id   = parseInt(node._id, 10);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityNode#availability
   * @propertyOf AvailabilityNode
   * @returns {number} Node's availability (as a percentage)
   */
  self.availability = parseFloat(node._availability);

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

  var hashbits = [self.id, self.availability, self.serviceCount];

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
    for (var i=0, len=node.ipinterfaces.ipinterface.length, iface; i < len; i++) {
      iface = new AvailabilityIpInterface(node.ipinterfaces.ipinterface[i]);
      self.ipinterfaces.push(iface);
      hashbits.push(iface.hash);
    }
  }

  self.hash = md5(hashbits.join('|'));
}

AvailabilityNode.prototype.toJSON = function() {
  return {
    _id: this.id,
    _availability: this.availability,
    '_service-count': this.serviceCount,
    '_service-down-count': this.serviceDownCount,
    ipinterfaces: {
      ipinterface: this.ipinterfaces
    }
  };
};

module.exports = AvailabilityNode;