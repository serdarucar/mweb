'use strict';

var moment = require('moment');

exports.prettifyDate = function (timestamp) {
  return moment(new Date(timestamp)).format('D.M.YYYY H:m:s');
};
