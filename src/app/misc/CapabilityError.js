/**
 * @ngdoc object
 * @name CapabilityError
 * @param {string} capability the capability type
 * @param {string} message (optional) an error message
 * @constructor
 */
function CapabilityError(capability, message) {
  'use strict';

  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name CapabilityError#capability
   * @propertyOf CapabilityError
   * @returns {string} The capability type.
   */
  self.capability = capability;

  /**
   * @description
   * @ngdoc property
   * @name CapabilityError#message
   * @propertyOf CapabilityError
   * @returns {string} The error message.
   */
  self.message = message;

}

CapabilityError.prototype.toString = function() {
  'use strict';
  var self = this, ret = 'Your device or server does not support ' + self.capability;
  if (self.message) {
    ret += ': ' + self.message;
  } else {
    ret += '.';
  }
  return ret;
};

module.exports = CapabilityError;