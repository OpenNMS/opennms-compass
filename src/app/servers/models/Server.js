'use strict';

var moment = require('moment'),
  URI = require('urijs');

/**
 * @ngdoc object
 * @name Server
 * @param {Object} server a server JSON object
 * @constructor
 */
function Server(server) {
  var self = this,
    _server = server || {};

  /**
   * @description
   * @ngdoc property
   * @name Server#_id
   * @propertyOf Server
   * @returns {string} Unique Identifier
   */
  self._id = _server._id;

  /**
   * @description
   * @ngdoc property
   * @name Server#_rev
   * @propertyOf Server
   * @returns {string} Revision
   */
  self._rev = _server._rev;

  /**
   * @description
   * @ngdoc property
   * @name Server#name
   * @propertyOf Server
   * @returns {string} Server Name
   */
  self.name = _server.name;

  /**
   * @description
   * @ngdoc property
   * @name Server#url
   * @propertyOf Server
   * @returns {string} The root URL of the server.
   */
  self.url = _server.url;

  /**
   * @description
   * @ngdoc property
   * @name Server#username
   * @propertyOf Server
   * @returns {string} The username used to connect to the server.
   */
  self.username = _server.username;

  /**
   * @description
   * @ngdoc property
   * @name Server#password
   * @propertyOf Server
   * @returns {string} The password used to connect to the server.
   */
  self.password = _server.password;

}

Server.prototype.relativeUrl = function(segment) {
  return this.url? URI(this.url).segment(segment).toString() : undefined;
};

Server.prototype.restUrl = function(segment) {
  if (this.url) {
    var url = URI(this.url).segment('rest/');
    if (segment) {
      url.segment(segment);
    }
    return url.toString();
  }

  return undefined;
};

Server.prototype.getHost = function() {
  return URI(this.url).hostname();
}

Server.prototype.equals = function(that) {
  return that &&
    this.url      === that.url &&
    this.username === that.username &&
    this.password === that.password &&
    this._id      === that._id;
}

module.exports = Server;
