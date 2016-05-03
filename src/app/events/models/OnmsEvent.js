'use strict';

var moment = require('moment'),
  md5 = require('js-md5'),
  StringUtils = require('../../misc/String');

/**
 * @ngdoc object
 * @name Event
 * @param {Object} event an event JSON object
 * @constructor
 */
function OnmsEvent(event) {
  //console.log('new Event():', event);
  var self = this;

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#id
   * @propertyOf OnmsEvent
   * @returns {number} Unique identifier for the event
   */
  self.id = parseInt(event._id, 10);

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#uei
   * @propertyOf OnmsEvent
   * @returns {string} Universal Event Identifer (UEI) for this event
   */
  self.uei = event.uei;

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#title
   * @propertyOf OnmsEvent
   * @returns {string} A readable title for the event (based on the UEI).
   */
   self.title = StringUtils.formatUei(self.uei);

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#nodeId
   * @propertyOf OnmsEvent
   * @returns {number} Unique integer identifier for node
   */
  self.nodeId = Number(event.nodeId);

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#nodeLabel
   * @propertyOf OnmsEvent
   * @returns {string} The human-readable name of the node of this event.
   */
  self.nodeLabel = event.nodeLabel;

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#ipAddress
   * @propertyOf OnmsEvent
   * @returns {string} IP Address of node's interface
   */
  self.ipAddress = event.ipAddress;

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#severity
   * @propertyOf OnmsEvent
   * @returns {string} Severity the of event.
   */
  self.severity = event._severity;

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#createTime
   * @propertyOf OnmsEvent
   * @returns {*|Date} Creation time of event in database
   */
  self.createTime = moment(event.createTime);

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#time
   * @propertyOf OnmsEvent
   * @returns {*|Date} The &lt;time&gt; element from the Event Data Stream DTD, which is the time the event was received by the source process.
   */
  self.time = moment(event.time);

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#source
   * @propertyOf OnmsEvent
   * @returns {string} The subsystem the event originated from.
   */
  self.source = event.source;

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#log
   * @propertyOf OnmsEvent
   * @returns {boolean} Whether the event was logged but not displayed.
   */
  self.log = event._log === 'Y';

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#display
   * @propertyOf OnmsEvent
   * @returns {boolean} Whether the event was both logged and displayed.
   */
  self.display = event._display === 'Y';

  /**
   * @description
   * @ngdoc property
   * @name Event
   * @propertyOf OnmsEvent
   * @returns {string} Free-form textual description of the event
   */
  self.description = event.description;

  /**
   * @description
   * @ngdoc property
   * @name OnmsEvent#logMessage
   * @propertyOf OnmsEvent
   * @returns {string} Formatted display text to control how the event will appear in the browser.
   */
  self.logMessage = event.logMessage;

  // Check to see if the event JSON has the 'serviceType' property before parsing it.
  if (event.hasOwnProperty('serviceType')) {

    /**
     * @description
     * @ngdoc property
     * @name OnmsEvent#serviceType
     * @propertyOf OnmsEvent
     * @returns {number} Unique integer identifier of service/poller package
     */
    self.serviceType = event.serviceType._id;

    /**
     * @description
     * @ngdoc property
     * @name OnmsEvent#serviceName
     * @propertyOf OnmsEvent
     * @returns {string} Human-readable name of the service
     */
    self.serviceName = event.serviceType.name;
  }
  // TODO: convert event.parms into an object for parms.
  self.parms = {};

  /**
   * @description Provides a unique hash key for the event
   * @ngdoc property
   * @name OnmsEvent#hash
   * @propertyOf OnmsEvent
   * @returns {string} an MD5 hash for the event
   */
  self.hash = md5([self.id, self.uei, self.nodeId].join('|'));
}

/**
 * @description Provides a formatted severity CSS class
 * @ngdoc method
 * @name OnmsEvent#getSeverityClass
 * @methodOf Event
 * @returns {string} formatted CSS class name
 */
OnmsEvent.prototype.getSeverityClass = function() {
  if (this.severity !== null && angular.isString(this.severity) && this.severity.length !== 0) { // eslint-disable-line no-magic-numbers
    return 'severity-'+angular.uppercase(this.severity);
  }
  return '';
};

OnmsEvent.prototype.toJSON = function() {
  var ret = {
    _id: this.id,
    uei: this.uei,
    nodeId: this.nodeId,
    nodeLabel: this.nodeLabel,
    ipAddress: this.ipAddress,
    _severity: this.severity,
    createTime: this.createTime,
    time: this.time,
    source: this.source,
    _log: this.log,
    _display: this.display,
    description: this.description,
    logMessage: this.logMessage,
    parms: this.parms
  };

  if (this.serviceType || this.serviceName) {
    ret.serviceType = {
      _id: this.serviceType,
      name: this.serviceName
    };
  }

  return ret;
};
module.exports = OnmsEvent;