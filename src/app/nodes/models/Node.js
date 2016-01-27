/* jshint -W069 */ /* "better written in dot notation" */

var MonitoredService = require('./MonitoredService'),
  moment = require('moment');

/**
 * @ngdoc object
 * @name Node
 * @param {Object} node a node JSON object
 * @constructor
 */
function Node(node) {
  'use strict';

  var self = this;
  var nullSafe = function(str) {
    if (str && str.trim() !== '') {
      return str;
    } else {
      return undefined;
    }
  };

  /**
   * @description
   * @ngdoc property
   * @name Node#id
   * @propertyOf Node
   * @returns {number} The unique node ID
   */
  self.id = parseInt(node['_id'], 10);

  /**
   * @description
   * @ngdoc property
   * @name Node#foreignSource
   * @propertyOf Node
   * @returns {string} The node's foreign source
   */
  self.foreignSource = nullSafe(node['_foreignSource']);

  /**
   * @description
   * @ngdoc property
   * @name Node#foreignId
   * @propertyOf Node
   * @returns {string} The node's foreignId field
   */
  self.foreignId = nullSafe(node['_foreignId']);

  /**
   * @description
   * @ngdoc property
   * @name Node#label
   * @propertyOf Node
   * @returns {string} The node's label
   */
  self.label = node['_label'];

  /**
   * @description
   * @ngdoc property
   * @name Node#type
   * @propertyOf Node
   * @returns {string} The node's type
   */
  self.type = node['_type'];

  /**
   * @description
   * @ngdoc property
   * @name Node#labelSource
   * @propertyOf Node
   * @returns {string} The source of the node's label
   */
  self.labelSource = node['labelSource'];

  /**
   * @description
   * @ngdoc property
   * @name Node#assets
   * @propertyOf Node
   * @returns {object} The node's assets
   */
  self.assets = node['assetRecord'];

  if (self.assets) {
    if (!self.isEmpty_(self.assets.lastModifiedDate)) {
      self.assets.lastModifiedDate = moment(self.assets.lastModifiedDate);
    }
    if (!self.isEmpty_(self.assets.id)) {
      self.assets.id = parseInt(self.assets.id, 10);
    }
    if (!self.isEmpty_(self.assets.latitude)) {
      self.assets.latitude = parseFloat(self.assets.latitude);
    }
    if (!self.isEmpty_(self.assets.longitude)) {
      self.assets.longitude = parseFloat(self.assets.longitude);
    }
    if (!self.isEmpty_(self.assets.node)) {
      self.assets.node = parseInt(self.assets.node, 10);
    }
    if (self.assets.category === 'Unspecified') {
      delete self.assets.category;
    }
  }

  /**
   * @description
   * @ngdoc property
   * @name Node#categories
   * @propertyOf Node
   * @returns {array} The node's list of categories
   */
  self.categories = node['categories'];
  if (self.categories && !angular.isArray(self.categories)) {
    self.categories = [self.categories];
  }
  if (self.categories) {
    self.categories = self.categories.map(function(cat) {
      return {
        id: parseInt(cat._id, 10),
        name: cat._name
      };
    });
  }

  /**
   * @description
   * @ngdoc property
   * @name Node#createTime
   * @propertyOf Node
   * @returns {moment} The node's creation time
   */
  self.createTime = moment(node['createTime']);

  /**
   * @description
   * @ngdoc property
   * @name Node#lastCapsdPoll
   * @propertyOf Node
   * @returns {string} The last time the node was scanned by Capsd
   */
  self.lastCapsdPoll = moment(node['lastCapsdPoll']);

  /**
   * @description
   * @ngdoc property
   * @name Node#sysContact
   * @propertyOf Node
   * @returns {string} The node's sysContact field
   */
  self.sysContact = nullSafe(node['sysContact']);

  /**
   * @description
   * @ngdoc property
   * @name Node#sysDescription
   * @propertyOf Node
   * @returns {string} The node's sysDescription field
   */
  self.sysDescription = nullSafe(node['sysDescription']);

  /**
   * @description
   * @ngdoc property
   * @name Node#sysLocation
   * @propertyOf Node
   * @returns {string} The node's sysLocation field
   */
  self.sysLocation = nullSafe(node['sysLocation']);

  /**
   * @description
   * @ngdoc property
   * @name Node#sysName
   * @propertyOf Node
   * @returns {string} The node's sysName field
   */
  self.sysName = nullSafe(node['sysName']);

  /**
   * @description
   * @ngdoc property
   * @name Node#sysObjectId
   * @propertyOf Node
   * @returns {string} The node's sysObjectId field
   */
  self.sysObjectId = nullSafe(node['sysObjectId']);
}

Node.prototype.getDisplayId = function() {
  'use strict';
  var self = this;
  var ret;

  if (self.foreignId) {
    if (self.foreignSource) {
      ret = self.foreignSource + '/';
    }
    ret += self.foreignId;
  }
  return ret;
};

Node.prototype.isEmpty_ = function(str) {
  'use strict';
  if (str && str !== '') {
    return false;
  } else {
    return true;
  }
};

Node.prototype.getAddress = function() {
  'use strict';
  var assets, prop, ret,
    self = this;

  if (this.assets) {
    assets = this.assets;
    if (!self.isEmpty_(assets.city) && !self.isEmpty_(assets.zip) || !self.isEmpty_(assets.latitude) && !self.isEmpty_(assets.longitude)) {
      ret = {
        address1: undefined,
        address2: undefined,
        city: undefined,
        state: undefined,
        zip: undefined,
        country: undefined,
        longitude: undefined,
        latitude: undefined
      };
      for (prop in ret) {
        if (self.isEmpty_(assets[prop])) {
          delete ret[prop];
        } else {
          ret[prop] = assets[prop];
        }
      }
      return ret;
    }
  }
  return undefined;
};

module.exports = Node;