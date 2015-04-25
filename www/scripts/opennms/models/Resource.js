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

  var self = this, i, prop;

  /**
   * @description
   * @ngdoc property
   * @name Resource#id
   * @propertyOf Resource
   * @returns {string} The unique resource ID
   */
  self.id = resource['id'];

  /**
   * @description
   * @ngdoc property
   * @name Resource#label
   * @propertyOf Resource
   * @returns {string} a description of the resource
   */
  self.label = resource['label'];

  /**
   * @description
   * @ngdoc property
   * @name Resource#rrdGraphAttributes
   * @propertyOf Resource
   * @returns {Object} a set of properties
   */
  self.rrdGraphAttributes = resource.rrdGraphAttributes;

  /**
   * @description
   * @ngdoc property
   * @name Resource#stringPropertyAttributes
   * @propertyOf Resource
   * @returns {Object} a set of properties
   */
  self.stringPropertyAttributes = resource.stringPropertyAttributes;

  /**
   * @description
   * @ngdoc property
   * @name Resource#externalValueAttributes
   * @propertyOf Resource
   * @returns {Object} a set of properties
   */
  self.externalValueAttributes = resource.externalValueAttributes;

  /**
   * @description
   * @ngdoc property
   * @name Resource#graphNames
   * @propertyOf Resource
   * @returns {array} an array of graph names
   */
  self.graphNames = [];
  if (resource.graphNames) {
    if (angular.isArray(resource.graphNames)) {
      self.graphNames = resource.graphNames;
    } else {
      self.graphNames.push(resource.graphNames);
    }
  }

  /**
   * @description
   * @ngdoc property
   * @name Resource#children
   * @propertyOf Resource
   * @returns {array} an array of child resources
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