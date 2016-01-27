var moment = require('moment');

/**
 * @ngdoc object
 * @name RestError
 * @param {string} url the URL requested
 * @param {object} data the data returned by the ReST call
 * @param {number} status the status code
 * @param {string} statusText the status text
 * @param {moment} time the time of the error
 * @constructor
 */
function RestError(url, data, status, statusText, time) {
  'use strict';

  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name RestError#url
   * @propertyOf RestError
   * @returns {string} The request URL.
   */
  self.url = url;

  /**
   * @description
   * @ngdoc property
   * @name RestError#data
   * @propertyOf RestError
   * @returns {Object} The data returned by the server.
   */
  self.data = data;

  /**
   * @description
   * @ngdoc property
   * @name RestError#status
   * @propertyOf RestError
   * @returns {number} The status code returned by the server.
   */
  self.status = parseInt(status, 10);

  /**
   * @description
   * @ngdoc property
   * @name RestError#statusText
   * @propertyOf RestError
   * @returns {string} The status text returned by the server (if any).
   */
  self.statusText = statusText;

  /**
   * @description
   * @ngdoc property
   * @name RestError#time
   * @propertyOf RestError
   * @returns {moment} The time the error occurred.
   */
  self.time = time || moment();

}

RestError.prototype.permissionDenied = function() {
  'use strict';
  return this.status === 401 || this.status === 403;
};

RestError.prototype.toString = function() {
  'use strict';
  var self = this, ret = 'Error ';
  if (self.status && self.status > 0) {
    ret += this.status + ' ';
  }
  ret += 'requesting URL ' + self.url + ': ';
  if (self.caller) {
    ret = self.caller + ': ' + ret;
  }
  if (self.statusText) {
    ret += ' ' + self.statusText;
  } else if (self.permissionDenied()) {
    ret += ' Permission denied.';
  }
  ret += ' [' + self.time.format('lll') + ']';
  return ret;
};

module.exports = RestError;