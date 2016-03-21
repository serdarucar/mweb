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
.controller('listCtrl', function listCtrl($scope, listStorage, $rootScope,$http) {

  $scope.lists = [];
  $scope.listMembers = [];
  $scope.listMemberCount = 0;

  $scope.selectedAddresses=[];
  $scope.allListsSelected=false;

  $scope.selectedListsCount=0;

  listStorage.get().success(function(lists) {
  	angular.forEach(lists,function(list){
  		list.selected=false;
  		list.allAddressesSelected=false;
  	});
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

  $scope.selectList=function(l){
	  $scope.selectedListsCount+=l.selected ? 1:-1;
	  $scope.allListsSelected=$scope.lists.every(function(list){
		  return list.selected;
	  })
  }

  $scope.selectAllLists=function(){
	  var toggleStatus = $scope.allListsSelected;
	  angular.forEach($scope.lists,function(list){
		  $scope.selectedListsCount=toggleStatus?$scope.lists.length:0;
		  list.selected=toggleStatus;
	  });
  }

  $scope.ListHoverOut = function () {
      this.hoverDelete = false;
  };

  $scope.selectAllAddresses=function(){
  	var toggle=$scope.lists[$rootScope.listIdx].allAddressesSelected;
  	angular.forEach($scope.listMembers, function (member) {
  		var index = $scope.selectedAddresses.indexOf(member);
  		if(toggle){
  			if(index==-1)
  				$scope.selectedAddresses.push(member);
  		}
  		else{
  			if(index>-1)
  				$scope.selectedAddresses.splice(index,1);
  		}
  	});
  }

  $scope.checkAllAddressesSelected=function(){
	 var list=$scope.lists[$rootScope.listIdx];
   if(list.members.length==0){
    list.allAddressesSelected= false;
	return;
	}
   list.allAddressesSelected=list.members.every(function(member){
     return $scope.selectedAddresses.indexOf(member)>-1;
   });
  };

  $scope.selectAddress=function(address){
  	var index = $scope.selectedAddresses.indexOf(address);
  	if (index == -1) {
  		$scope.selectedAddresses.push(address);
  	}
  	else{
  		$scope.selectedAddresses.splice(index,1);
  	}
  	$scope.checkAllAddressesSelected();
  }

  $scope.isBothChecked=function(){
	  if($scope.selectedListsCount>0 && $scope.selectedAddresses.length>0)
		  return true;
	  return false;
  }

  $scope.addToSelected=function(){
  	for(var listIdx=0;listIdx<$scope.lists.length;listIdx++){
  		var list=$scope.lists[listIdx];
  		if(list.selected){
  			var listId=list.id;

  			$rootScope.listId = listId;
  			$rootScope.listIdx=listIdx;
  			$rootScope.listArray=list.members;

        $scope.addMultiMailToList($scope.selectedAddresses);
        list.selected=false;
        list.allAddressesSelected=false;
  		}
  	}
    $scope.allListsSelected=false;
    $scope.selectedAddresses=[];
  };

  $scope.removeFromSelected=function(){
  	for(var listIdx=0;listIdx<$scope.lists.length;listIdx++){
  		var list=$scope.lists[listIdx];
  		if(list.selected){
  			var listId=list.id;

  			$rootScope.listId = listId;
  			$rootScope.listIdx=listIdx;
  			$rootScope.listArray=list.members;

  			$scope.removeMultiMailFromList($scope.selectedAddresses);
        list.selected=false;
  		}
  	}
    $scope.selectedAddresses=[];
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

  $scope.excelRead = function (sheets,name) {
    var emailList=[];
	  angular.forEach(sheets,function(sheet){
		 angular.forEach(sheet,function(cell){
			 if(cell[0]!=="!"){
				 if(cell.t==="s"){
            var cellValue=cell.w.trim();
					 if($scope.isEmail(cellValue) && emailList.indexOf(cellValue)<0)
						 emailList.push(cellValue);
				 }
			 }
		 }) ;
	  });

    $scope.addFromFile(name,emailList);
  };

  $scope.excelReadError = function (e) {
	 alert("Couldn't read Excel file");
   console.log(e);
  };

  $scope.csvRead=function(data,name){
    var emailList=$scope.rawDataToEmailList(data);
    $scope.addFromFile(name,emailList);
  };

  $scope.docxRead=function(data,name){
    var rawContent="";
    angular.forEach(data.DOM,function(node){
      rawContent+=node.innerText+"\n";
    });
    var emailList=$scope.rawDataToEmailList(rawContent);
    $scope.addFromFile(name,emailList);
  };

  $scope.checkListExists=function(listName){
    for(var idx=0;idx<$scope.lists.length;idx++){
      if($scope.lists[idx].name.toLowerCase()===listName.toLowerCase()){
        $rootScope.listId = $scope.lists[idx].id;
        $rootScope.listIdx=idx;
        $rootScope.listArray=$scope.lists[idx].members;
        return true;
      }
    }
    return false;
  }

  $scope.addFromFile=function(name,emailList){
    if($scope.checkListExists(name)){
      $scope.addMultiMailToList(emailList);
    }
    else{
      $scope.createNewList(name,emailList);
    }
  }

  $scope.rawDataToEmailList=function(data){
    var emailList=[];

    data = data.replace(/\s+/g, ',');
    data = data.replace(/;+/g, ',');
    data = data.replace(/:+/g, ',');
    data = data.replace(/\|+/g, ',');
    data = data.replace(/\>+/g, ',');
    data = data.replace(/\<+/g, ',');
    data = data.replace(/,+/g, ',');

    var list = [];
    list = data.split(",");

    angular.forEach(list,function(listItem){
      var item=listItem.trim();
      if($scope.isEmail(item) && emailList.indexOf(item)<0){
        emailList.push(item);
      }
    });

    return emailList;
  }

  $scope.switchListMembers = function (idx, listid, listname) {
	var linkify=function(text) {
		var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
		return text.replace(urlRegex,url);
	}
	$http.get("http://myapi.mobiroller.com//JSON/GetJSOn/?accountScreenID=292241").success(function(data){
		console.log(linkify(data.contentHtml));
	});
    $scope.listMembers = [];
    var members = [];
    members = $scope.lists[idx].members;
    for (var i = 0; i < members.length; i++) {
      $scope.listMembers.push(members[i]);
    }
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
	  $scope.checkAllAddressesSelected();
  };

  $scope.isEmail=function(email) {
  	var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  	return regex.test(email);
  }

  $scope.createNewList = function (listname,emailList) {
    var emailarray=[];
    if ( listname ) {
      if(emailList){
        emailarray=emailList;
      }
      else{
        if ( $scope.multiMailAdd ) {
          var rawlist = $scope.multiMailAdd;
        } else {
          var rawlist = '';
        }

        var name = $.trim(listname);

        if ( name.length === 0 ) {
          return;
        }
        /*
        rawlist = rawlist.replace(/\s+/g, ',');
        rawlist = rawlist.replace(/;+/g, ',');
        rawlist = rawlist.replace(/:+/g, ',');
        rawlist = rawlist.replace(/\|+/g, ',');
        rawlist = rawlist.replace(/\>+/g, ',');
        rawlist = rawlist.replace(/\<+/g, ',');
        rawlist = rawlist.replace(/,+/g, ',');

        var list = [];
        list = rawlist.split(",");



        var emailarray = [];

        $.each(list, function(idx, obj) {
          if ( $scope.isEmail(obj) ) {
            emailarray.push(obj);
          }
        });
        */
        emailarray=$scope.rawDataToEmailList(rawlist);
      }

      var newlist = {
        'listname'          : listname,
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

    if ( $scope.isEmail(mail) ) {
      var mailChkd = mail;
    } else {
      return;
    }

    listArray.push(mailChkd);

    listStorage.update(listId, listArray).success(function() {
      listBoxScope.listMemberCount = listBoxScope.listMembers.length;
      $scope.lists[listIdx].members.push(mail);
    }).error(function() {
      alert('Failed to add this MEMBER');
    });
  };

  $scope.addMultiMailToList=function(emails){
    var listId = $rootScope.listId;
    var listIdx = $rootScope.listIdx;
    var listArray = $rootScope.listArray;
    //var listBoxScope = angular.element($("#listBox")).scope();
	var isChanged=false;
    angular.forEach(emails,function(email){
      if(listArray.indexOf(email)<0){
		  listArray.push(email);
		  isChanged=true;
	  }
    });
	if(isChanged){
		listStorage.update(listId, listArray).success(function() {
      //listBoxScope.listMemberCount = listBoxScope.listMembers.length;
			$scope.lists[listIdx].members=listArray;
		}).error(function() {
			alert('Failed to add this MEMBER');
		});
	}
  }

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

  $scope.removeMultiMailFromList = function (emails) {
    var listId = $rootScope.listId;
    var listIdx = $rootScope.listIdx;
    var listArray = $rootScope.listArray;

    var tmpEmails=emails;


    for(var i=tmpEmails.length-1;i>=0;i--){
      var idx=listArray.indexOf(tmpEmails[i]);
      if(idx>-1){
        listArray.splice(idx,1);
      }
      else{
        tmpEmails.splice(i,1);
      }
    }

    var garbage = {
      list: listId,
      member: tmpEmails
    };

    listStorage.update(listId, listArray).success(function() {
      $scope.listMembers=listArray;
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

  sessionStorage.get(10).success(function(sessions) {
    $scope.sessions = sessions;
  }).error(function(error) {
    alert('Failed to load SESSIONs');
  });

})
.controller('allsessionCtrl', function sessionCtrl($scope, sessionStorage, $rootScope) {

  $scope.sessions = [];

  sessionStorage.get(0).success(function(sessions) {
    $scope.sessions = sessions;
  }).error(function(error) {
    alert('Failed to load SESSIONs');
  });

})
.factory('sessionStorage', function ($http) {

  return {
    get: function (last) {
      var url = '/api/rest/session/' + last;
      return $http.get(url);
    }
  };

})
.controller('profileCtrl', function profileCtrl($scope, $rootScope){
    $scope.user = {};
    $scope.loadUser=function(user) {
        $scope.user = user;
    }


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

})
.controller('deliveryCtrl', function deliveryCtrl($scope, deliveryStorage, $rootScope) {

  $scope.delivery = [];
  $scope.deliveryTotal = [];
  $scope.deliverySent = [];
  $scope.deliveryDefer = [];
  $scope.deliveryBounce = [];
  $scope.mailContent = false;
  $scope.totalContent = true;
  $scope.sentContent = true;
  $scope.deferContent = true;
  $scope.bounceContent = true;

  $scope.showMail = function () {
    $scope.mailContent = false;
    $scope.totalContent = true;
    $scope.sentContent = true;
    $scope.deferContent = true;
    $scope.bounceContent = true;
  };

  $scope.showTotal = function () {
    deliveryStorage.get($scope.sid, 'all').success(function(deliveryTotal) {
      $scope.deliveryTotal = deliveryTotal;
      $scope.mailContent = true;
      $scope.totalContent = false;
      $scope.sentContent = true;
      $scope.deferContent = true;
      $scope.bounceContent = true;
    }).error(function() {
      alert('Failed to deliver Total');
    });
  };

  $scope.showSent = function () {
    deliveryStorage.get($scope.sid, 'sent').success(function(deliverySent) {
      $scope.deliverySent = deliverySent;
      $scope.mailContent = true;
      $scope.totalContent = true;
      $scope.sentContent = false;
      $scope.deferContent = true;
      $scope.bounceContent = true;
    }).error(function() {
      alert('Failed to deliver Sent');
    });
  };

  $scope.showDefer = function () {
    deliveryStorage.get($scope.sid, 'retry').success(function(deliveryDefer) {
      $scope.deliveryDefer = deliveryDefer;
      $scope.mailContent = true;
      $scope.totalContent = true;
      $scope.sentContent = true;
      $scope.deferContent = false;
      $scope.bounceContent = true;
    }).error(function() {
      alert('Failed to deliver Defer');
    });
  };

  $scope.showBounce = function () {
    deliveryStorage.get($scope.sid, 'unsent').success(function(deliveryBounce) {
      $scope.deliveryBounce = deliveryBounce;
      $scope.mailContent = true;
      $scope.totalContent = true;
      $scope.sentContent = true;
      $scope.deferContent = true;
      $scope.bounceContent = false;
    }).error(function() {
      alert('Failed to deliver Bounce');
    });
  };

})
.factory('deliveryStorage', function ($http) {

  return {
    get: function (sid, scode) {
      var url = '/api/rest/delivery/main/' + sid + '/' + scode;
      return $http.get(url);
    }
  };

})
.controller('loginCtrl', function loginCtrl($scope) {

  $scope.logIn = true;

  $scope.showRegister = function () {
    $scope.logIn = false;
  };

  $scope.showLogin = function () {
    $scope.logIn = true;
  };

})
.directive('excelImport', function () {
  return {
    restrict: 'E',
    template: '<input type="file" style="display:none;" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />',
    replace: true,
    link: function (scope, element, attrs) {

      function handleSelect() {
        var files = this.files;
        for (var i = 0, f = files[i]; i != files.length; ++i) {
          var reader = new FileReader();
          var fullName = f.name.trim();

          var dotndex=fullName.lastIndexOf('.');

          var name=fullName.substring(0,dotndex).trim();
          var fileExt=fullName.substring(dotndex+1);

          reader.onload = function(e) {
            var data = e.target.result;

            if(fileExt.toLowerCase()==='csv'){
              var handleCsvRead=scope[attrs.oncsvread];
              if(typeof handleCsvRead ==='function'){
                handleCsvRead(data,name);
              }
            }
            else{
              try {
                var workbook = XLSX.read(data, {type: 'binary'});

                if (attrs.onread) {
                  var handleRead = scope[attrs.onread];
                  if (typeof handleRead === "function") {
                    handleRead(workbook.Sheets,name);
                  }
                }
              } catch(e) {
                if (attrs.onerror) {
                  var handleError = scope[attrs.onerror];
                  if (typeof handleError === "function") {
                    handleError(e);
                  }
                }
              }
            }
            // Clear input file
            element.val('');
          };

          reader.readAsBinaryString(f);
        }
      }

      element.on('change', handleSelect);
    }
  };
})
.directive('textImport',function(){
  return {
    restrict: 'E',
    template: '<input type="file" style="display:none;" accept="text/plain" />',
    replace: true,
    link: function (scope, element, attrs) {

      function handleSelect() {
        var files = this.files;
        for (var i = 0, f = files[i]; i != files.length; ++i) {
          var reader = new FileReader();
          var fullName = f.name.trim();

          var dotndex=fullName.lastIndexOf('.');
          var name=fullName.substring(0,dotndex).trim();

          reader.onload = function(e) {
            var data = e.target.result;
            var handleTxtRead=scope[attrs.onread];
            if(typeof handleTxtRead ==='function'){
                handleTxtRead(data,name);
            }
            element.val('');
          };

          reader.readAsBinaryString(f);
        }
      }

      element.on('change', handleSelect);
    }
  };
})
.directive('docxImport',function(){
  return {
    restrict: 'E',
    template: '<input type="file" style="display:none;" accept="application/pdf,application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document" />',
    replace: true,
    link: function (scope, element, attrs) {

      function handleSelect() {
        var files = this.files;
        for (var i = 0, f = files[i]; i != files.length; ++i) {
          var reader = new FileReader();
          var fullName = f.name.trim();

          var dotndex=fullName.lastIndexOf('.');
          var name=fullName.substring(0,dotndex).trim();

          reader.onload = function(e) {
            var data = e.target.result;
            var handleDocxRead=scope[attrs.onread];
            if(typeof handleDocxRead ==='function'){
              var doc=docx(btoa(data));
              handleDocxRead(doc,name);
            }
            element.val('');
          };

          reader.readAsBinaryString(f);
        }
      }

      element.on('change', handleSelect);
    }
  };
});
