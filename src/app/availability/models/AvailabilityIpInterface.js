/* jshint -W069 */ /* "better written in dot notation" */

var AvailabilityService = require('./AvailabilityService'),
  moment = require('moment');

/**
 * @ngdoc object
 * @name AvailabilityIpInterface
 * @param {Object} iface Availability node IP interface as JSON object
 * @constructor
 */
function AvailabilityIpInterface(iface) {
  'use strict';

  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityIpInterface#id
   * @propertyOf AvailabilityIpInterface
   * @returns {number} Interface ID
   */
  self.id   = Number(iface['_id']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityIpInterface#availability
   * @propertyOf AvailabilityIpInterface
   * @returns {number} Interface's availability (as a percentage)
   */
  self.availability = parseFloat(iface['_availability']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityIpInterface#address
   * @propertyOf AvailabilityIpInterface
   * @returns {string} The IP address of the interface.
   */
  self.address = iface['_address'];

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
    for (var i=0, len=iface.services.service.length; i < len; i++) {
      self.services.push(new AvailabilityService(iface.services.service[i]));
    }
  }

}

module.exports = AvailabilityIpInterface;