'use strict';

exports.prettifyDate = function (timestamp) {
  return moment(new Date(timestamp)).format('D.M.YYYY H:m:s');
};
