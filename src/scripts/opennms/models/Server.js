/* global moment: true */
/* global URI: true */
/* jshint -W069 */ /* "better written in dot notation" */

/**
 * @ngdoc object
 * @name Server
 * @param {Object} server a server JSON object
 * @constructor
 */
function Server(server) {
  'use strict';

  var self = this;
  if (!server) {
    server = {};
  }

  /* LokiJS Metadata */
  self.meta = server.meta;
  self.$loki = server.$loki;

  /**
   * @description
   * @ngdoc property
   * @name Server#id
   * @propertyOf Server
   * @returns {string} Unique Identifier
   */
  self.id = server.id;

  /**
   * @description
   * @ngdoc property
   * @name Server#name
   * @propertyOf Server
   * @returns {string} Server Name
   */
  self.name = server.name;

  /**
   * @description
   * @ngdoc property
   * @name Server#url
   * @propertyOf Server
   * @returns {string} The root URL of the server.
   */
  self.url = server.url;

  /**
   * @description
   * @ngdoc property
   * @name Server#username
   * @propertyOf Server
   * @returns {string} The username used to connect to the server.
   */
  self.username = server.username;

  /**
   * @description
   * @ngdoc property
   * @name Server#password
   * @propertyOf Server
   * @returns {string} The password used to connect to the server.
   */
  self.password = server.password;

  self.relativeUrl = function(segment) {
    return self.url? URI(self.url).segment(segment).toString() : undefined;
  };

  self.restUrl = function(segment) {
    if (self.url) {
      var url = URI(self.url).segment('rest/');
      if (segment) {
        url.segment(segment);
      }
      return url.toString();
    } else {
      return undefined;
    }
  };
}