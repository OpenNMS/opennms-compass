/* jshint -W069 */ /* "better written in dot notation" */

var moment = require('moment'),
  URI = require('urijs');

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

  /**
   * @description
   * @ngdoc property
   * @name Server#_id
   * @propertyOf Server
   * @returns {string} Unique Identifier
   */
  self._id = server._id;

  /**
   * @description
   * @ngdoc property
   * @name Server#_rev
   * @propertyOf Server
   * @returns {string} Revision
   */
  self._rev = server._rev;

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

module.exports = Server;
