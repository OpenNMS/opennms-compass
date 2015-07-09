/// <reference path="../../typings/tsd.d.ts" />

/*
import moment = require('momentjs');

class RestError {
  constructor(url: string, data: any, status: number, statusText: string, time: moment) {
    this.url        = url;
    this.data       = data;
    this.status     = status;
    this.statusText = statusText;
    this.time       = time || moment();
  }

  permissionDenied() {
    return this.status === 401 || this.status === 403;
  }

  toString() {
    var ret: string = 'Error ';
    if (this.status && this.status > 0) {
      ret += this.status + ' ';
    }
    ret += 'requesting URL ' + this.url + ': ';
    if (this.statusText) {
      ret += ' ' + this.statusText;
    } else if (this.permissionDenied()) {
      ret += ' Permission denied.';
    }
    ret += ' [' + this.time.format('lll') + ']';
    return ret;
  }
}
*/