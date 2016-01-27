/* jshint -W069 */ /* "better written in dot notation" */

var AvailabilityCategory = require('./AvailabilityCategory'),
  moment = require('moment');

/**
 * @ngdoc object
 * @name AvailabilitySection
 * @param {Object} section Availability section as JSON object
 * @constructor
 */
function AvailabilitySection(section) {
  'use strict';

  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilitySection#name
   * @propertyOf AvailabilitySection
   * @returns {string} Section name
   */
  self.name   = section['_name'];

  /**
   * @description
   * @ngdoc property
   * @name AvailabilitySection#categories
   * @propertyOf AvailabilitySection
   * @returns {array} An array of categories
   */
  self.categories = [];
  if (section.categories && section.categories.category) {
    if (!angular.isArray(section.categories.category)) {
      section.categories.category = [section.categories.category];
    }
    for (var i=0, len=section.categories.category.length; i < len; i++) {
      self.categories.push(new AvailabilityCategory(section.categories.category[i]));
    }
  }

}

module.exports = AvailabilitySection;