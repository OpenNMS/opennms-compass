'use strict';

var moment = require('moment');

/**
 * @ngdoc object
 * @name AvailabilityCategory
 * @param {Object} cat Availability category as JSON object
 * @constructor
 */
function AvailabilityCategory(cat) {
  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#name
   * @propertyOf AvailabilityCategory
   * @returns {string} Category name
   */
  self.name = cat._name;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#normalThreshold
   * @propertyOf AvailabilityCategory
   * @returns {number} The threshold to be considered "normal" severity
   */
  self.normalThreshold = parseFloat(cat['_normal-threshold']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#warningThreshold
   * @propertyOf AvailabilityCategory
   * @returns {number} The threshold to be considered "warning" severity
   */
  self.warningThreshold = parseFloat(cat['_warning-threshold']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#availability
   * @propertyOf AvailabilityCategory
   * @returns {number} The availability percentage of the entire category
   */
  self.availability = parseFloat(cat.availability);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#availabilityClass
   * @propertyOf AvailabilityCategory
   * @returns {string} The class to use when displaying availability
   */
  self.availabilityClass = cat['availability-class'];

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#comment
   * @propertyOf AvailabilityCategory
   * @returns {string} The comment associated with the category
   */
  self.comment = cat.comment;

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#lastUpdated
   * @propertyOf AvailabilityCategory
   * @returns {moment} The date the category was last updated
   */
  self.lastUpdated = moment(cat['last-updated']);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#outageClass
   * @propertyOf AvailabilityCategory
   * @returns {string} The class to use when displaying outages
   */
  self.outageClass = cat['outage-class'];

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#outageText
   * @propertyOf AvailabilityCategory
   * @returns {string} The display text for outages
   */
  self.outageText = cat['outage-text'];

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#serviceDownCount
   * @propertyOf AvailabilityCategory
   * @returns {number} The number of services down
   */
  self.serviceDownCount = parseInt(cat['service-down-count'], 10);

  /**
   * @description
   * @ngdoc property
   * @name AvailabilityCategory#servicePercentage
   * @propertyOf AvailabilityCategory
   * @returns {number} The percentage of services available in the category
   */
  self.servicePercentage = parseFloat(cat['service-percentage']);
}

AvailabilityCategory.prototype.toJSON = function() {
  return {
    _name: this.name,
    '_normal-threshold': this.normalThreshold,
    '_warning-threshold': this.warningThreshold,
    availability: this.availability,
    'availability-class': this.availabilityClass,
    comment: this.comment,
    'last-updated': this.lastUpdated,
    'outage-class': this.outageClass,
    'outage-text': this.outageText,
    'service-down-count': this.serviceDownCount,
    'service-percentage': this.servicePercentage
  };
};

module.exports = AvailabilityCategory;