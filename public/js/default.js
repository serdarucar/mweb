//
//
//
this.$('.navbar-brand').css('cursor', 'pointer');

$('.navbar-brand').click(function() {
  window.location.href = "/";
});

$(document).ready(function() {
  $('#dp3').datepicker({
    autoclose: true,
    format: "dd.mm.yyyy",
    todayHighlight: true,
    weekStart: 1
  });

  $('#dp3').datepicker().on('changeDate', function(e) {

    var d = e.date;
    var day = d.getDate();
    var mo = d.getMonth() + 1;
    var yea = d.getFullYear();

    day = day + "";
    if (day.length == 1) {
      day = "0" + day;
    }
    mo = mo + "";
    if (mo.length == 1) {
      mo = "0" + mo;
    }

    window.location = '/' + yea + mo + day;
  });
});

// $('#dp3').on('click', function(e) {
//   e.preventDefault();
//   if ($(this).datepicker('widget').is(':visible')) {
//     console.log('XXX');
//   }
// });
