'use strict';

var AvailabilityService = require('./AvailabilityService'),
  md5 = require('js-md5'),
  moment = require('moment');

/**
 * @ngdoc object
 * @name AvailabilityIpInterface
 * @param {Object} iface Availability node IP interface as JSON object
 * @constructor
 */
function AvailabilityIpInterface(iface) {
  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityIpInterface#id
   * @propertyOf AvailabilityIpInterface
   * @returns {number} Interface ID
   */
  self.id   = parseInt(iface._id, 10);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityIpInterface#availability
   * @propertyOf AvailabilityIpInterface
   * @returns {number} Interface's availability (as a percentage)
   */
  self.availability = parseFloat(iface._availability);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityIpInterface#address
   * @propertyOf AvailabilityIpInterface
   * @returns {string} The IP address of the interface.
   */
  self.address = iface._address;

  var hashbits = [self.id, self.availability, self.address];

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityIpInterface#services
   * @propertyOf AvailabilityIpInterface
   * @returns {array} An array of AvailabilityService objects.
   */
  self.services = [];
  if (iface.services && iface.services.service) {
    if (!angular.isArray(iface.services.service)) {
      iface.services.service = [iface.services.service];
    }
    for (var i=0, len=iface.services.service.length, svc; i < len; i++) {
      svc = new AvailabilityService(iface.services.service[i]);
      self.services.push(svc);
      hashbits.push(svc.hash);
    }
  }

  self.hash = md5(hashbits.join('|'));
}

AvailabilityIpInterface.prototype.toJSON = function() {
  return {
    _id: this.id,
    _availability: this.availability,
    _address: this.address,
    services: {
      service: self.services
    }
  };
};

module.exports = AvailabilityIpInterface;