'use strict';

var OnmsEvent = require('../../events/models/OnmsEvent'),
  moment = require('moment'),
  md5 = require('js-md5'),
  StringUtils = require('../../misc/String');

var emptyParms = /\s+parms:\s*$/;

var DEFAULT_ALARM_ID = -1;
var DEFAULT_ALARM_COUNT = 0;

/**
 * @ngdoc object
 * @name Alarm
 * @param {Object} alarm an alarm JSON object
 * @param {boolean} isJson whether the alarm data structure came from JSON or XML
 * @constructor
 */
function Alarm(alarm, isJson) {
  var self = this;
  //console.log('alarm:' + angular.toJson(alarm));

  /**
   * @description
   * @ngdoc property
   * @name Alarm#id
   * @propertyOf Alarm
   * @returns {number} Alarm ID
   */
  self.id   = parseInt(alarm._id||DEFAULT_ALARM_ID, 10);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#count
   * @propertyOf Alarm
   * @returns {number} Number of times the alarm has triggered.
   */
  self.count = parseInt(alarm._count||DEFAULT_ALARM_ID, 10);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#ackUser
   * @propertyOf Alarm
   * @returns {string} User that acknowledged the alarm.
   */
  self.ackUser = alarm.ackUser;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#ackTime
   * @propertyOf Alarm
   * @returns {string} The time the alarm was acknowledged.
   */
  self.ackTime = alarm.ackTime? moment(alarm.ackTime) : undefined;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#uei
   * @propertyOf Alarm
   * @returns {string} Universal Event Identifier for the alarm.
   */
  self.uei   = alarm.uei;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#title
   * @propertyOf Alarm
   * @returns {string} A readable title for the alarm (based on the UEI).
   */
  self.title = StringUtils.formatUei(self.uei);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#severity
   * @propertyOf Alarm
   * @returns {string} Severity the of alarm.
   */
  self.severity   = alarm._severity;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#type
   * @propertyOf Alarm
   * @returns {number} Alarm type ID, see {@link http://www.opennms.org/wiki/Configuring_alarms#Alarm_Types alarm types}
   */
  self.type   = parseInt(alarm._type, 10);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#description
   * @propertyOf Alarm
   * @returns {string} The description of the alarm
   */
  self.description   = alarm.description;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#firstTimeEvent
   * @propertyOf Alarm
   * @returns {*|Date} The first time an event was reduced by this alarm
   */
  self.firstEventTime   = moment(alarm.firstEventTime);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#lastEventTime
   * @propertyOf Alarm
   * @returns {*|Date} The last time an event was reduced by this alarm
   */
  self.lastEventTime   = moment(alarm.lastEventTime);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#lastEvent
   * @propertyOf Alarm
   * @returns {Event} The last event to be reduced by this alarm
   */
  self.lastEvent   = new OnmsEvent(alarm.lastEvent);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#logMessage
   * @propertyOf Alarm
   * @returns {string} Formatted display text to control how the alarm will appear in the browser.
   */
  self.logMessage   = alarm.logMessage.replace(emptyParms, '');

  /**
   * @description
   * @ngdoc property
   * @name Alarm#reductionKey
   * @propertyOf Alarm
   * @returns {string} Reduction key for this alarm
   */
  self.reductionKey   = alarm.reductionKey;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#troubleTicketId
   * @propertyOf Alarm
   * @returns {string} The trouble ticket ID associated with this alarm, if any.
   */
  self.troubleTicketId = alarm.troubleTicket;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#troubleTicketState
   * @propertyOf Alarm
   * @returns {string} The trouble ticket state, if any.
   */
  self.troubleTicketState = alarm.troubleTicketState;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#nodeId
   * @propertyOf Alarm
   * @returns {number} Unique integer identifier for node
   */
  self.nodeId   = parseInt(alarm.nodeId, 10);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#nodeLabel
   * @propertyOf Alarm
   * @returns {string} The human-readable name of the node of this alarm.
   */
  self.nodeLabel   = alarm.nodeLabel;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#stickyMemo
   * @propertyOf Alarm
   * @returns {object} The sticky memo associated with this alarm.
   */
  self.stickyMemo = alarm.stickyMemo;
  if (self.stickyMemo) {
    if (self.stickyMemo.updated) {
      self.stickyMemo.updated = moment(self.stickyMemo.updated);
    }
    if (self.stickyMemo.created) {
      self.stickyMemo.created = moment(self.stickyMemo.created);
    }
  }

  /**
   * @description
   * @ngdoc property
   * @name Alarm#journalMemo
   * @propertyOf Alarm
   * @returns {object} The journal (reduction key) memo associated with this alarm.
   */
  self.journalMemo = alarm.reductionKeyMemo;
  if (self.journalMemo) {
    if (self.journalMemo.updated) {
      self.journalMemo.updated = moment(self.journalMemo.updated);
    }
    if (self.journalMemo.created) {
      self.journalMemo.created = moment(self.journalMemo.created);
    }
  }

  /**
   * @description
   * @ngdoc property
   * @name Alarm#parms
   * @propertyOf Alarm
   * @returns {object} The &lt;parms&gt; element for this alarm.
   */
  self.parms   = alarm.parms;
  // alarm.parms;

  /**
   * @description Provides a unique hash key for the alarm
   * @ngdoc property
   * @name Alarm#hash
   * @propertyOf Alarm
   * @returns {string} an MD5 hash for the alarm
   */
  self.hash = md5([self.id, self.uei, self.ackUser, self.type, self.firstEventTime, self.lastEventTime].join('|'));

  /**
   * @description
   * @ngdoc property
   * @name Alarm#className
   * @propertyOf Alarm
   * @returns {string} the name of this object class, used for troubleshooting and testing.
   */
  self.className = 'Alarm';
}

/**
 * @description Provides a formatted severity CSS class
 * @ngdoc method
 * @name Alarm#getSeverityClass
 * @methodOf Alarm
 * @returns {string} formatted CSS class name
 */
Alarm.prototype.getSeverityClass = function() {
  if (this.severity !== null && angular.isString(this.severity) && this.severity.length !== 0) { // eslint-disable-line no-magic-numbers
    return 'severity-'+angular.uppercase(this.severity);
  }
  return '';
};

/**
 * @description Whether or not the alarm should be considered "cleared" or not
 * @ngdoc method
 * @name Alarm#showCleared
 * @methodOf Alarm
 * @returns {boolean} a true or false value if the alarm has Regained or Succeeded
 */
Alarm.prototype.showCleared = function() {
  if (this.severity === 'CLEARED') {
    if (this.title.contains('Regained')) {
      return false;
    }
    if (this.title.contains('Succeeded')) {
      return false;
    }
    return true;
  }
  return false;
};

Alarm.prototype.toJSON = function() {
  return {
    _id: this.id,
    _count: this.count,
    ackUser: this.ackUser,
    ackTime: this.ackTime,
    uei: this.uei,
    _severity: this.severity,
    _type: this.type,
    description: this.description,
    firstEventTime: this.firstEventTime,
    lastEventTime: this.lastEventTime,
    lastEvent: this.lastEvent,
    logMessage: this.logMessage,
    reductionKey: this.reductionKey,
    troubleTicket: this.troubleTicketId,
    troubleTicketState: this.troubleTicketState,
    nodeId: this.nodeId,
    nodeLabel: this.nodeLabel,
    stickyMemo: this.stickyMemo,
    journalMemo: this.journalMemo,
    parms: this.parms
  };
};

module.exports = Alarm;
