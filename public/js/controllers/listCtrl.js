/*global listApp, angular */
'use strict';

/**
 * The main controller for the app. The controller:
 * - retrieves and persists the model via the listStorage service
 * - exposes the model to the template and provides event handlers
 */
listApp.controller('listCtrl', function listCtrl($scope, listStorage) {

  $scope.lists = [];
  $scope.listMembers = [];
  $scope.listCount = 0;
  // $scope.members = [];

  listStorage.get().success(function(lists) {
    $scope.lists = lists;
    //$scope.members = lists.members;
  }).error(function(error) {
    alert('Failed to load LISTs');
  });

  $scope.switchListMembers = function (idx, listid, listname) {
    $scope.listMembers = [];
    var members = $scope.lists[idx].members;
    for (var i = 0; i < members.length; i++) {
      $scope.listMembers.push({email: members[i], listid: listid});
    }
    $scope.listName = listname;
    $scope.listCount = $scope.listMembers.length;
  };

// @todo: sending index from template removes erroneous when it's ordered on the client side. maybe indexOf should be used.
  $scope.removeList = function (list, idx) {
    listStorage.delete(list.id).success(function() {
      $scope.lists.splice(idx, 1);
      $scope.listMembers = [];
      $scope.listName = null;
      $scope.listCount = 0;
    }).error(function() {
      alert('Failed to delete this LIST');
    });
  };

  $scope.removeMember = function (member, idx, listid) {
    // listStorage.update(selectedListId, member, 'delete').success(function() {
    //   $scope.listMembers.splice(idx, 1);
    // }).error(function() {
    //   alert('Failed to delete this MEMBER');
    // });
  };

});
