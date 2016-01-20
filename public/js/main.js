/*global angular */
/*jshint unused:false */
'use strict';

/**
 * The main TodoMVC app module
 *
 * @type {angular.Module}
 */

var mailApp = angular.module('mailApp', [])
.config(function($interpolateProvider) {

  $interpolateProvider.startSymbol('{[{').endSymbol('}]}');

})
.run(function($rootScope) {

  $rootScope.lists = [];
  $rootScope.listId = [];
  $rootScope.listIdx = null;
  $rootScope.listArray = [];
  $rootScope.listHeader = null;
  $rootScope.newList = true;
  $rootScope.oldList = false;
  $rootScope.oldListObjects = true;
  $rootScope.newListInputPh = 'NEW LIST';
  $rootScope.newListInputBtnState = null;

  $rootScope.sessions = [];

})
.controller('listCtrl', function listCtrl($scope, listStorage, $rootScope) {

  $scope.lists = [];
  $scope.listMembers = [];
  $scope.listMemberCount = 0;
  $scope.listid = [];

  listStorage.get().success(function(lists) {
    $scope.lists = lists;

    if ($scope.lists.length > 0) {
      var switchListId = $scope.lists[0].id;
      var switchListName = $scope.lists[0].name;
      $scope.switchListMembers(0, switchListId, switchListName);
    }
  }).error(function(error) {
    alert('Failed to load LISTs');
  });

  $scope.ListHoverIn = function () {
    this.hoverDelete = true;
    //this.hoverCheck = true;
  };

  $scope.ListHoverOut = function () {
      this.hoverDelete = false;
      //this.hoverCheck = false;
  };

  $scope.crateNewFocus = function () {

    $rootScope.newList = true;
    $rootScope.oldList = false;
    $rootScope.listHeader = 'NEW LIST';
    $rootScope.newListInputPh = 'LIST NAME';
    $rootScope.newListInputBtnState = null;
    $rootScope.oldListObjects = false;

    var listCountScope = angular.element($("#listMemberCount")).scope();
    listCountScope.listMemberCount = 0;
  };

  $scope.switchListMembers = function (idx, listid, listname) {
    $scope.listMembers = [];
    var members = [];
    members = $scope.lists[idx].members;
    for (var i = 0; i < members.length; i++) {
      $scope.listMembers.push(members[i]);
    }
    $scope.listId = listid;
    $scope.listMemberCount = $scope.listMembers.length;

    $rootScope.newList = false;
    $rootScope.oldList = true;
    $rootScope.oldListObjects = true;
    $rootScope.listId = listid;
    $rootScope.listIdx = idx;
    $rootScope.listHeader = listname;
    $rootScope.newListInputPh = 'NEW LIST';
    $rootScope.newListInputBtnState = 'disabled';
    $rootScope.listArray = $scope.listMembers;
  };

  $scope.createNewList = function (listname) {

    if ( listname ) {

      if ( $scope.multiMailAdd ) {
        var rawlist = $scope.multiMailAdd;
      } else {
        var rawlist = '';
      }

      var name = $.trim(listname);

      if ( name.length === 0 ) {
        return;
      }

      rawlist = rawlist.replace(/\s+/g, ',');
      rawlist = rawlist.replace(/;+/g, ',');
      rawlist = rawlist.replace(/:+/g, ',');
      rawlist = rawlist.replace(/\|+/g, ',');
      rawlist = rawlist.replace(/\>+/g, ',');
      rawlist = rawlist.replace(/\<+/g, ',');
      rawlist = rawlist.replace(/,+/g, ',');

      var list = [];
      list = rawlist.split(",");

      function IsEmail(email) {
        var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(email);
      }

      var emailarray = [];

      $.each(list, function(idx, obj) {
        if ( IsEmail(obj) ) {
          emailarray.push(obj);
        }
      });

      var newlist = {
        'listname'          : name,
        'listdata'          : emailarray,
        'listcount'         : emailarray.length
      };

      listStorage.create(newlist).success(function(savedList) {
        $scope.lists.unshift(savedList);
        $scope.multiMailAdd = null;
        $scope.listAdd = null;

        var switchListId = $scope.lists[0].id;
        var switchListName = $scope.lists[0].name;

        $scope.switchListMembers(0, switchListId, switchListName);
      }).error(function() {
        alert('Failed to add this LIST');
      });
    } else {
      return;
    }
  };

  $scope.addMailToList = function (mail) {
    $scope.mailAdd = null;
    var listId = $rootScope.listId;
    var listIdx = $rootScope.listIdx;
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
      listBoxScope.listMemberCount = listBoxScope.listMembers.length;
      $scope.lists[listIdx].members.push(mail);
    }).error(function() {
      alert('Failed to add this MEMBER');
    });
  };

  $scope.removeMailFromList = function (mail) {
    var listId = $rootScope.listId;
    var listIdx = $rootScope.listIdx;
    var listArray = $rootScope.listArray;

    listArray.splice(listArray.indexOf(mail), 1);
    var garbage = {
      list: listId,
      member: mail
    };

    listStorage.update(listId, listArray).success(function() {
      $scope.listMembers.slice($scope.listMembers.indexOf(mail), 1);
      $scope.lists[listIdx].members = listArray;
      $scope.listMemberCount = $scope.listMembers.length;
      listStorage.recycle(garbage); // @todo: success/error callback.

      var switchListId = $scope.lists[listIdx].id;
      var switchListName = $scope.lists[listIdx].name;

      $scope.switchListMembers(listIdx, switchListId, switchListName);
    }).error(function() {
      alert('Failed to remove this MEMBER');
    });
  };

  $scope.removeList = function (list) {

    listStorage.delete(list.id).success(function() {
      $scope.lists.splice($scope.lists.indexOf(list), 1);
      $scope.listMembers = [];
      $scope.listName = null;
      $scope.listMemberCount = 0;

      var switchListId = $scope.lists[0].id;
      var switchListName = $scope.lists[0].name;

      $scope.switchListMembers(0, switchListId, switchListName);
    }).error(function() {
      alert('Failed to delete this LIST');
    });
  };
})
.factory('listStorage', function ($http) {

  return {
    get: function () {
      var url = '/api/rest/list';
      return $http.get(url);
    },
    create: function (list) {
      var url = '/api/rest/list';
      return $http.post(url, list);
    },
    update: function (id, newlist) {
      var url = '/api/rest/list/' + id;
      return $http.put(url, newlist);
    },
    delete: function(id) {
      var url = '/api/rest/list/' + id;
      return $http.delete(url);
    },
    recycle: function (garbage) {
      var url = '/api/rest/trash';
      return $http.put(url, garbage);
    }
  };

})
.controller('sessionCtrl', function sessionCtrl($scope, sessionStorage, $rootScope) {

  $scope.sessions = [];

  sessionStorage.get().success(function(sessions) {
    $scope.sessions = sessions;
    // $scope.sessions.date = $scope.sessions.date.replace(/,/,"/");
  }).error(function(error) {
    alert('Failed to load SESSIONs');
  });

  $scope.orderByDate = function(item) {
      var parts = item.date.toString().split(',');
      var number = parseInt(parts[2] + parts[1] + parts[0]);

      return -number;
  };

})
.factory('sessionStorage', function ($http) {

  return {
    get: function (id) {
      var url = '/api/rest/session';
      return $http.get(url);
    }
  };

})
.controller('activityCtrl', function activityCtrl($scope, activityStorage, $rootScope) {

  $scope.activity = [];

  activityStorage.get().success(function(activity) {
    $scope.activity = activity;
  }).error(function(error) {
    alert('Failed to load Activities');
  });

})
.factory('activityStorage', function ($http) {

  return {
    get: function () {
      var url = '/api/rest/admin/activity';
      return $http.get(url);
    }
  };

});
