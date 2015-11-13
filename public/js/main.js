/*global angular */
/*jshint unused:false */
'use strict';

/**
 * The main TodoMVC app module
 *
 * @type {angular.Module}
 */

var listApp = angular.module('listApp', [])
.config(function($interpolateProvider) {

  $interpolateProvider.startSymbol('{[{').endSymbol('}]}');

})
.run(function($rootScope) {

  $rootScope.listId = [];
  $rootScope.listArray = [];

})
.controller('listCtrl', function listCtrl($scope, listStorage, $rootScope) {

  $scope.lists = [];
  $scope.listMembers = [];
  $scope.listCount = 0;
  $scope.listid = [];

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
      $scope.listMembers.push(members[i]);
    }
    $scope.listName = listname;
    $scope.listId = listid;
    $scope.listCount = $scope.listMembers.length;

    $rootScope.listId = listid;
    $rootScope.listArray = $scope.listMembers;
  };

  $scope.addMailToList = function (mail) {
    $scope.mailAdd = null;
    var listId = $rootScope.listId;
    var listArray = $rootScope.listArray;
    var listBoxScope = angular.element($("#listBox")).scope();

    if ( IsEmail(mail) ) {
      var mailChkd = mail;
    } else {
      return;
    }

    function IsEmail(email) {
      var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
      return regex.test(email);
    }

    listArray.push(mailChkd);

    listStorage.update(listId, listArray).success(function() {
      listBoxScope.listCount = listBoxScope.listMembers.length;
    }).error(function() {
      alert('Failed to add this MEMBER');
    });
  };

  $scope.removeMailFromList = function (mail) {
    var listId = $rootScope.listId;
    var listArray = $rootScope.listArray;

    listArray.splice(listArray.indexOf(mail), 1);

    listStorage.update(listId, listArray).success(function() {
      $scope.listMembers.slice($scope.listMembers.indexOf(mail), 1);
      $scope.listCount = $scope.listMembers.length;
    }).error(function() {
      alert('Failed to remove this MEMBER');
    });
  };

// @todo: sending index from template removes erroneous when it's ordered on the client side. maybe indexOf should be used.
  $scope.removeList = function (list) {
    listStorage.delete(list.id).success(function() {
      $scope.lists.splice($scope.lists.indexOf(list), 1);
      $scope.listMembers = [];
      $scope.listName = null;
      $scope.listCount = 0;
    }).error(function() {
      alert('Failed to delete this LIST');
    });
  };

  $scope.removeMember = function (member, idx, listid) {
    // listStorage.update(selectedListId, member, 'delete').success(function() {
    //   $scope.listMembers.splice($scope.listMembers.indexOf(member), 1);
    // }).error(function() {
    //   alert('Failed to delete this MEMBER');
    // });
  };
})
.factory('listStorage', function ($http) {

  return {
    get: function () {
      var url = '/api/rest/list';
      return $http.get(url);
    },
    update: function (id, newlist) {
      var url = '/api/rest/list/' + id;
      return $http.put(url, newlist);
    },
    delete: function(id) {
      var url = '/api/rest/list/' + id;
      return $http.delete(url);
    }
  };

});
