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

// listen.config(function($interpolateProvider) {
//   $interpolateProvider.startSymbol('{[{');
//   $interpolateProvider.endSymbol('}]}');
// });

// Google Analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-69299701-1', 'auto');
ga('send', 'pageview');
