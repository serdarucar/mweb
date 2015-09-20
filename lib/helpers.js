'use strict';

var moment = require('moment');

exports.prettifyDate = function(timestamp) {
  return moment(new Date(timestamp)).format('DD.MM.YYYY');
};

exports.prettifyTime = function(timestamp) {
  return moment(new Date(timestamp)).format('HH:mm:ss');
};
