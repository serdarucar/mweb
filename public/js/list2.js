//
//
// process list-add form
$('.btn-list-crea').click(function(event) {

  event.preventDefault();

  var listNameIsEmpty = false;
  var listAreaIsEmpty = false;

  //var listNameTxt = prompt("Please Enter List Name:", "My-List-0");
  var listNameTxt = $('input[name="newlist"]').val();

  if ( listNameTxt.length === 0 ) {
    listNameIsEmpty = true;
  }

  if ( $('textarea[name="textAreaList"]').val().length === 0 ) {
    listAreaIsEmpty = true;
  }

  if (!listNameIsEmpty && !listAreaIsEmpty) {

    var rawlist = $('textarea[name="textAreaList"]').val();
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

    var listname = $.trim(listNameTxt);
    var listNameIsDuplicate = false;

    $('#my-list option').each(function() {
      if ($(this).attr('name-data').toLowerCase() === listname.toLowerCase()) {
        listNameIsDuplicate = true;
      }
    });

    if (emailarray.length > 0) {

      if (!listNameIsDuplicate) {

        // get the form data
        // there are many ways to get this data using jQuery (you can use the class or id also)
        var formData = {
            'listname'          : listname,
            'listdata'          : emailarray,
            'listcount'         : emailarray.length
        };

        // process the form
        $.ajax({
            type        : 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url         : '/savelist2', // the url where we want to POST
            data        : formData, // our data object
            dataType    : 'json', // what type of data do we expect back from the server
            encode      : true
        })
        // using the done promise callback
        .done(function(data) {

            // log data to the console so we can see
            //console.log(data);
            // here we will handle errors and validation messages
        });

        // window.setTimeout('location.reload(true)', 100);
        window.location = '/lists';

      } else {
        alert('There is already a list named ' + listname.toLowerCase() + '!\nPlease choose another name');
      }

    } else {
      alert('There are no valid mails on the list you provided.\nList can not be saved.');
    }

  } else {
    alert('Please enter mail addresses in the form.');
  }
});

// process list-del form
$('.btn-list-del').click(function(event) {

  event.preventDefault();

  var checkedAtLeastOne = false;

  $('#my-list option').each(function() {
    if ($(this).is(":selected")) {
      checkedAtLeastOne = true;
    }
  });

  if (checkedAtLeastOne) {

    var listdels = $('#my-list option:selected').map(function() {
      return $(this).attr('idVal');
    }).toArray();

    // get the form data
    // there are many ways to get this data using jQuery (you can use the class or id also)
    var formData = {
        'listdelete'        : listdels
    };

    var confirmation = confirm('Are you sure to delete selected list(s)?');

    if (confirmation == true) {

      // process the form
      $.ajax({
          type        : 'POST', // define the type of HTTP verb we want to use (POST for our form)
          url         : '/deletelist', // the url where we want to POST
          data        : formData, // our data object
          dataType    : 'json', // what type of data do we expect back from the server
          encode      : true
      })
      // using the done promise callback
      .done(function(data) {

          // log data to the console so we can see
          //console.log(data);
          // here we will handle errors and validation messages
      });

      window.setTimeout('location.reload(true)', 100);

    }

  } else {
    alert('No list selected!');
  }
});

// process members-add form
$('.btn-members-add').click(function(event) {

  event.preventDefault();

  var listAreaIsEmpty = false;

  if ( $('textarea[name="textAreaList"]').val().length === 0 ) {
    listAreaIsEmpty = true;
  }

  var checkedListCount = 0;
  var checkedListId = false;
  var checkedListName = false;

  $('#my-list option').each(function() {
    if ($(this).is(":selected")) {
      checkedListCount++;
      checkedListId = $(this).attr('idVal');
      checkedListName = $(this).attr('name-data');
      checkedListIdx = $(this).attr('idxVal');
    }
  });

  var checkedAtLeastOne = false;

  if (checkedListCount === 1) {

    var rawlist = $('textarea[name="textAreaList"]').val();
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

    var memberall = $('#list-members-' + checkedListIdx + ' option').map(function() {
      return $(this).text();
    }).toArray();

    var newlist = memberall.concat(emailarray.filter(function (item) {
        return memberall.indexOf(item) < 0;
    }));

    if (memberall.length !== newlist.length) {

      if (!listAreaIsEmpty) {

        // get the form data
        // there are many ways to get this data using jQuery (you can use the class or id also)
        var formData = {
            'listname'        : checkedListName,
            'listdata'        : newlist,
            'listcount'       : newlist.length,
            'listdelid'       : checkedListId
        };

        // process the form
        $.ajax({
            type        : 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url         : '/updatelist', // the url where we want to POST
            data        : formData, // our data object
            dataType    : 'json', // what type of data do we expect back from the server
            encode      : true
        })
        // using the done promise callback
        .done(function(data) {

            // log data to the console so we can see
            //console.log(data);
            // here we will handle errors and validation messages
        });

        window.setTimeout('location.reload(true)', 100);

      } else {
        alert('Please enter mail addresses in the form.');
      }
    } else {
      alert('Adresses you entered are already in the list.');
    }
  } else {
    alert('Please select only one list.');
  }
});

// process members-remove form
$('.btn-members-rm').click(function(event) {

  event.preventDefault();

  var checkedListCount = 0;
  var checkedListId = false;
  var checkedListName = false;

  $('#my-list option').each(function() {
    if ($(this).is(":selected")) {
      checkedListCount++;
      checkedListId = $(this).attr('idVal');
      checkedListName = $(this).attr('name-data');
      checkedListIdx = $(this).attr('idxVal');
    }
  });

  var checkedAtLeastOne = false;

  $('#list-members-' + checkedListIdx + ' option:selected').each(function() {
    if ($(this).is(":selected")) {
      checkedAtLeastOne = true;
    }
  });

  if (checkedAtLeastOne && checkedListCount === 1) {

    var memberdels = $('#list-members-' + checkedListIdx + ' option:selected').map(function() {
      return $(this).text();
    }).toArray();

    var memberall = $('#list-members-' + checkedListIdx + ' option').map(function() {
      return $(this).text();
    }).toArray();

    var newlist = $(memberall).not(memberdels).get();

    if (newlist.length === 0) {

      // get the form data
      // there are many ways to get this data using jQuery (you can use the class or id also)
      var formData = {
          'listdelid'        : checkedListId
      };

      var confirmation = confirm('Are you sure to delete last member(s)?\n(note that the list will be deleted too.)');

      if (confirmation == true) {

        // process the form
        $.ajax({
            type        : 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url         : '/deletelast', // the url where we want to POST
            data        : formData, // our data object
            dataType    : 'json', // what type of data do we expect back from the server
            encode      : true
        })
        // using the done promise callback
        .done(function(data) {

            // log data to the console so we can see
            //console.log(data);
            // here we will handle errors and validation messages
        });

        window.setTimeout('location.reload(true)', 100);

      }

    } else {

      // get the form data
      // there are many ways to get this data using jQuery (you can use the class or id also)
      var formData = {
          'listname'        : checkedListName,
          'listdata'        : newlist,
          'listcount'       : newlist.length,
          'listdelid'       : checkedListId
      };

      var confirmation = confirm('Are you sure to delete selected member(s)?');

      if (confirmation == true) {

        // process the form
        $.ajax({
            type        : 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url         : '/updatelist', // the url where we want to POST
            data        : formData, // our data object
            dataType    : 'json', // what type of data do we expect back from the server
            encode      : true
        })
        // using the done promise callback
        .done(function(data) {

            // log data to the console so we can see
            //console.log(data);
            // here we will handle errors and validation messages
        });

        window.setTimeout('location.reload(true)', 100);

      }

    }

  } else {
    alert('Please select only one list.');
  }
});

this.$('#list select option').on('click', function(e){
  idx = $(this).attr('idxVal');
  //var incDef = document.getElementById('listinc-default');
  var incBlock = document.getElementById('listinc-' + idx);
  //console.log($('#listinc-' + idx));
  //$('.list-include').style.display = 'none';
  $('.list-include').css('display', 'none');
  //incDef.style.display = 'none';
  incBlock.style.display = 'block';
  e.preventDefault();
});
