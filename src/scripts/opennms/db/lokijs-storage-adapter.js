/**
 * LokiJS StorageSyncAdapter
 * @author Benjamin reed <ranger@opennms.org>
 *
 * A CloudStorage sync adapter example for LokiJS
 */

/*jslint browser: true, node: true, plusplus: true, indent: 2 */

function CloudSyncAdapterError() {
  'use strict';
}

CloudSyncAdapterError.prototype = new Error();

function CloudSyncAdapter(options) {
  'use strict';
  window.plugins.CloudStorage.setDefaultBackend('local');
  this.options = options;
  console.log('LokiJS CloudSyncAdapter initializing.');
}

CloudSyncAdapter.prototype.getName = function(name) {
  'use strict';
  return ((this.options && this.options.prefix)? this.options.prefix : '') +
    name +
    ((this.options && this.options.suffix)? this.options.suffix : '');
};

CloudSyncAdapter.prototype.saveDatabase = function (name, data, callback) {
  'use strict';
  var fileName = this.getName(name);
  console.log('LokiJS CloudSyncAdapter: saveDatabase: ' + fileName);
  // lokijs actually passes us a stringified JSON string, but CloudStorage expects an object
  if (typeof data === 'string') {
    data = JSON.parse(data);
  }
  window.plugins.CloudStorage.writeFile(fileName, data, function(res) {
    console.log('save succeeded: ' + JSON.stringify(res));
    callback(null);
  }, function(err) {
    console.log('save failed: ' + JSON.stringify(err));
    callback(new CloudSyncAdapterError(err));
  });
};

CloudSyncAdapter.prototype.loadDatabase = function (name, callback) {
  'use strict';
  var fileName = this.getName(name);
  console.log('LokiJS CloudSyncAdapter: loadDatabase: ' + fileName);
  window.plugins.CloudStorage.readFile(fileName, function(res) {
    if (res.success) {
    // CloudStorage returns a JSON object, but lokijs expects it stringified
      callback(JSON.stringify(res.contents));
    } else {
      callback(new CloudSyncAdapterError('Unknown error occurred.  Result was: ' + JSON.stringify(res)));
    }
  }, function(err) {
    console.log('load failed: ' + JSON.stringify(err));
    callback(new CloudSyncAdapterError(err));
  });
};

console.log('hey');
window.cloudSyncAdapter = CloudSyncAdapter;