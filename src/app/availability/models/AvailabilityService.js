'use strict';

var moment = require('moment'),
  md5 = require('blueimp-md5');

/**
 * @ngdoc object
 * @name AvailabilityService
 * @param {Object} svc Availability service as JSON object
 * @constructor
 */
function AvailabilityService(svc) {
  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityService#id
   * @propertyOf AvailabilityService
   * @returns {number} Service ID
   */
  self.id   = Number(svc.id);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityService#availability
   * @propertyOf AvailabilityService
   * @returns {number} Service's availability (as a percentage)
   */
  self.availability = parseFloat(svc.availability);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityService#name
   * @propertyOf AvailabilityService
   * @returns {string} The name of the service.
   */
  self.name = svc.name;

  self.hash = md5([self.id, self.availability, self.name].join('|'));
}

AvailabilityService.prototype.toJSON = function() {
  return {
    id: this.id,
    availability: this.availability,
    name: this.name
  };
};

module.exports = AvailabilityService;