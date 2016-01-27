/* jshint -W069 */ /* "better written in dot notation" */

var moment = require('moment');

/**
 * @ngdoc object
 * @name AvailabilityService
 * @param {Object} svc Availability service as JSON object
 * @constructor
 */
function AvailabilityService(svc) {
  'use strict';

  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityService#id
   * @propertyOf AvailabilityService
   * @returns {number} Service ID
   */
  self.id   = Number(svc['_id']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityService#availability
   * @propertyOf AvailabilityService
   * @returns {number} Service's availability (as a percentage)
   */
  self.availability = parseFloat(svc['_availability']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityService#name
   * @propertyOf AvailabilityService
   * @returns {string} The name of the service.
   */
  self.name = svc['_name'];

}

module.exports = AvailabilityService;