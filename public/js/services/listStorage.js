/*global listApp */
'use strict';

/**
 * Services that persists and retrieves LISTSs from localStorage
 */
listApp.factory('listStorage', function ($http) {

  return {
    get: function () {
      var url = '/api/rest/list';
      return $http.get(url);
    },
    delete: function(id) {
      var url = '/api/rest/list/' + id;
      return $http.delete(url);
    }
  };
});
