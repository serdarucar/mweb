'use strict';

var moment = require('moment');

exports.prettifyDate = function(timestamp) {
  if (moment(new Date(timestamp)).isValid()) {
    return moment(new Date(timestamp)).format('DD.MM.YYYY');
  } else {
    return moment(new Date()).format('DD.MM.YYYY');
  }
};

exports.prettifyTime = function(timestamp) {
  return moment(new Date(timestamp)).format('HH:mm:ss');
};

exports.trimNavSubject = function(text) {
  if (text.length > 19) {
    return text.substring(0, 19) + '...';
  } else {
    return text;
  }
};
