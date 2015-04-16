/* global moment: true */
/* jshint -W069 */ /* "better written in dot notation" */

/**
 * @ngdoc object
 * @name Resource
 * @param {Object} resource a resource JSON object
 * @constructor
 */
function Resource(resource) {
  'use strict';

  var self = this, i;

  /**
   * @description
   * @ngdoc property
   * @name Resource#id
   * @propertyOf Resource
   * @returns {string} The unique resource ID
   */
  self.id = resource['_id'];

  /**
   * @description
   * @ngdoc property
   * @name Resource#label
   * @propertyOf Resource
   * @returns {string} a description of the resource
   */
  self.label = resource['_label'];

  /**
   * @description
   * @ngdoc property
   * @name Resource#stringPropertyAttributes
   * @propertyOf Resource
   * @returns {Object} a set of properties
   */
  self.stringPropertyAttributes = [];
  if (resource.stringPropertyAttributes && resource.stringPropertyAttributes.entry) {
    if (angular.isArray(resource.stringPropertyAttributes.entry)) {
      for (i=0; i < resource.stringPropertyAttributes.entry.length; i++) {
        self.stringPropertyAttributes.push(resource.stringPropertyAttributes.entry[i].key);
      }
    } else {
        self.stringPropertyAttributes.push(resource.stringPropertyAttributes.entry.key);
    }
  }

  /**
   * @description
   * @ngdoc property
   * @name Resource#externalValueAttributes
   * @propertyOf Resource
   * @returns {Object} a set of properties
   */
  self.externalValueAttributes = [];
  if (resource.externalValueAttributes && resource.externalValueAttributes.entry) {
    if (angular.isArray(resource.externalValueAttributes.entry)) {
      for (i=0; i < resource.externalValueAttributes.entry.length; i++) {
        self.externalValueAttributes.push(resource.externalValueAttributes.entry[i].key);
      }
    } else {
        self.externalValueAttributes.push(resource.externalValueAttributes.entry.key);
    }
  }

  /**
   * @description
   * @ngdoc property
   * @name Resource#children
   * @propertyOf Resource
   * @returns {array} An array of child resources.
   */
  self.children = [];
  if (resource.children && resource.children.resource) {
    if (angular.isArray(resource.children.resource)) {
      for (i=0; i < resource.children.resource.length; i++) {
        self.children.push(new Resource(resource.children.resource[i]));
      }
    } else {
      self.children.push(new Resource(resource.children.resource));
    }
  }

}