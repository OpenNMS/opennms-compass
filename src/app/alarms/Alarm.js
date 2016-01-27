/* jshint -W069 */ /* "better written in dot notation" */

var OnmsEvent = require('../events/models/Event'),
  moment = require('moment');

/**
 * @ngdoc object
 * @name Alarm
 * @param {Object} alarm an alarm JSON object
 * @constructor
 */
function Alarm(alarm) {
  'use strict';

  var self = this;
  //console.log('alarm:', alarm);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#id
   * @propertyOf Alarm
   * @returns {number} Alarm ID
   */
  self.id   = parseInt(alarm['_id'], 10);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#count
   * @propertyOf Alarm
   * @returns {number} Number of times the alarm has triggered.
   */
  self.count = parseInt(alarm['_count'], 10);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#ackUser
   * @propertyOf Alarm
   * @returns {string} User that acknowledged the alarm.
   */
  self.ackUser = alarm['ackUser'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#ackTime
   * @propertyOf Alarm
   * @returns {string} The time the alarm was acknowledged.
   */
  self.ackTime = alarm['ackTime']? moment(alarm['ackTime']) : undefined;

  /**
   * @description
   * @ngdoc property
   * @name Alarm#uei
   * @propertyOf Alarm
   * @returns {string} Universal Event Identifier for the alarm.
   */
  self.uei   = alarm['uei'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#title
   * @propertyOf Alarm
   * @returns {string} A readable title for the alarm (based on the UEI).
   */
  self.title = self.uei.replace(/^.*\//g, '').replace(/([A-Z])/g, ' $1');
  self.title = self.title.charAt(0).toUpperCase() + self.title.slice(1);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#severity
   * @propertyOf Alarm
   * @returns {string} Severity the of alarm.
   */
  self.severity   = alarm['_severity'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#type
   * @propertyOf Alarm
   * @returns {number} Alarm type ID, see {@link http://www.opennms.org/wiki/Configuring_alarms#Alarm_Types alarm types}
   */
  self.type   = parseInt(alarm['_type'], 10);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#description
   * @propertyOf Alarm
   * @returns {string} The description of the alarm
   */
  self.description   = alarm['description'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#firstTimeEvent
   * @propertyOf Alarm
   * @returns {*|Date} The first time an event was reduced by this alarm
   */
  self.firstEventTime   = moment(alarm['firstEventTime']);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#lastEventTime
   * @propertyOf Alarm
   * @returns {*|Date} The last time an event was reduced by this alarm
   */
  self.lastEventTime   = moment(alarm['lastEventTime']);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#lastEvent
   * @propertyOf Alarm
   * @returns {Event} The last event to be reduced by this alarm
   */
  self.lastEvent   = new OnmsEvent(alarm['lastEvent']);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#logMessage
   * @propertyOf Alarm
   * @returns {string} Formatted display text to control how the alarm will appear in the browser.
   */
  self.logMessage   = alarm['logMessage'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#reductionKey
   * @propertyOf Alarm
   * @returns {string} Reduction key for this alarm
   */
  self.reductionKey   = alarm['reductionKey'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#troubleTicketId
   * @propertyOf Alarm
   * @returns {string} The trouble ticket ID associated with this alarm, if any.
   */
  self.troubleTicketId = alarm['troubleTicket'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#troubleTicketState
   * @propertyOf Alarm
   * @returns {string} The trouble ticket state, if any.
   */
  self.troubleTicketState = alarm['troubleTicketState'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#nodeId
   * @propertyOf Alarm
   * @returns {number} Unique integer identifier for node
   */
  self.nodeId   = parseInt(alarm['nodeId'], 10);

  /**
   * @description
   * @ngdoc property
   * @name Alarm#nodeLabel
   * @propertyOf Alarm
   * @returns {string} The human-readable name of the node of this alarm.
   */
  self.nodeLabel   = alarm['nodeLabel'];

  /**
   * @description
   * @ngdoc property
   * @name Alarm#stickyMemo
   * @propertyOf Alarm
   * @returns {object} The sticky memo associated with this alarm.
   */
  self.stickyMemo = alarm['stickyMemo'];
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
  self.journalMemo = alarm['reductionKeyMemo'];
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
  self.parms   = {};
  // alarm['parms'];

  /**
   * @description Provides a formatted severity CSS class
   * @ngdoc method
   * @name Alarm#getSeverityClass
   * @methodOf Alarm
   * @returns {string} formatted CSS class name
   */
  self.getSeverityClass = function() {
    if (this.severity !== null && angular.isString(this.severity) && this.severity.length !== 0) {
      return 'severity-'+angular.uppercase(this.severity);
    }
    return '';
  };

  /**
   * @description
   * @ngdoc property
   * @name Alarm#className
   * @propertyOf Alarm
   * @returns {string} the name of this object class, used for troubleshooting and testing.
   */
  self.className = 'Alarm';

  self.showCleared = function() {
    if (self.severity === 'CLEARED') {
      if (self.title.contains('Regained')) {
        return false;
      }
      if (self.title.contains('Succeeded')) {
        return false;
      }
      return true;
    }
    return false;
  };
}

module.exports = Alarm;