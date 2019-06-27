'use strict';

var AvailabilityCategory = require('./AvailabilityCategory');
var moment = require('moment');
var md5 = require('blueimp-md5');

/**
 * @ngdoc object
 * @name AvailabilitySection
 * @param {Object} section Availability section as JSON object
 * @constructor
 */
function AvailabilitySection(section) {
  var self = this;

  console.log('section=', section);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilitySection#name
   * @propertyOf AvailabilitySection
   * @returns {string} Section name
   */
  self.name   = section.name;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilitySection#categories
   * @propertyOf AvailabilitySection
   * @returns {array} An array of categories
   */
  self.categories = [];
  if (section.categories && section.categories.category_asArray) {
    self.categories = section.categories.category_asArray.map((cat) => new AvailabilityCategory(cat));
  }
}

AvailabilitySection.prototype.toJSON = function() {
  return {
    name: this.name,
    categories: {
      category: this.categories
    }
  };
};

module.exports = AvailabilitySection;