'use strict';

var AvailabilityCategory = require('./AvailabilityCategory');
var moment = require('moment');
var md5 = require('js-md5');

/**
 * @ngdoc object
 * @name AvailabilitySection
 * @param {Object} section Availability section as JSON object
 * @constructor
 */
function AvailabilitySection(section) {
  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilitySection#name
   * @propertyOf AvailabilitySection
   * @returns {string} Section name
   */
  self.name   = section._name;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilitySection#categories
   * @propertyOf AvailabilitySection
   * @returns {array} An array of categories
   */
  self.categories = [];
  if (section.categories) {
    if (section.categories.category) {
      if (!angular.isArray(section.categories.category)) {
        section.categories.category = [section.categories.category];
      }
      section.categories = section.categories.category;
    }
    for (var i=0, len=section.categories.length; i < len; i++) {
      self.categories.push(new AvailabilityCategory(section.categories[i]));
    }
  }
}

AvailabilitySection.prototype.toJSON = function() {
  return {
    _name: this.name,
    categories: {
      category: this.categories
    }
  };
};

module.exports = AvailabilitySection;