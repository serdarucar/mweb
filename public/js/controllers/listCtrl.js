/*global listApp, angular */
'use strict';

/**
 * The main controller for the app. The controller:
 * - retrieves and persists the model via the listStorage service
 * - exposes the model to the template and provides event handlers
 */
listApp.controller('listCtrl', function listCtrl($scope, listStorage) {
  $scope.lists = [];
  // $scope.members = [];

  listStorage.get().success(function(lists) {
    $scope.lists = lists;
    //$scope.members = lists.members;
  }).error(function(error) {
    alert('Failed to load LISTs');
  });

  $scope.removeList = function (list) {
    listStorage.delete(list.id).success(function() {
      $scope.lists.splice($scope.lists.indexOf(list), 1);
    }).error(function() {
      alert('Failed to delete this LIST');
    });
  };
});
