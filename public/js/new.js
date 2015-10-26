//
//
//
$.fn.modal.Constructor.prototype.enforceFocus = function() {
  modal_this = this
  $(document).on('focusin.modal', function (e) {
    if (modal_this.$element[0] !== e.target && !modal_this.$element.has(e.target).length
    && !$(e.target.parentNode).hasClass('cke_dialog_ui_input_select')
    && !$(e.target.parentNode).hasClass('cke_dialog_ui_input_text')) {
      modal_this.$element.focus()
    }
  })
};

CKEDITOR.replace( 'mailBody' , {
  skin: 'office2013,/ext/ck/skin/office2013/',
  language: 'en'
});

// process mailsender form
$('.btn-mailsender').click(function(event) {

  event.preventDefault();

  var checkedAtLeastOne = false;
  var subjectIsEmpty = false;
  // var mailCount = 0;

  $('input[type="checkbox"].rcptList').each(function() {
    if ($(this).is(":checked")) {
      checkedAtLeastOne = true;
      // mailCount = mailCount + parseInt($(this).attr('count-data'));
    }
  });

  if ( $('input[name="inputSubject"]').val().length === 0 ) {
    subjectIsEmpty = true;
  }

  if (checkedAtLeastOne && !subjectIsEmpty) {

    var lists = $('input[type="checkbox"].rcptList:checked').map(function() {
      return $(this).val();
    }).toArray();

    var lists2 = $('input[type="checkbox"].rcptList:checked').map(function() {
      return $(this).attr('list-data');
    }).toArray();

    var data = CKEDITOR.instances.mailBody.document.getBody().getHtml();
      // get the form data
      // there are many ways to get this data using jQuery (you can use the class or id also)
      var formData = {
          'subject'           : $('input[name=inputSubject]').val(),
          'body'              : data,
          'recipients'        : lists,
          'listnames'         : lists2
      };

      // var confirmation = confirm(mailCount + ' recipients are selected in total.\nAre you sure to send the mails?');

      var confirmation = confirm('Are you sure to send the mails?');

      if (confirmation == true) {
        // process the form
        $.ajax({
            type        : 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url         : '/mailsender', // the url where we want to POST
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

        window.location = "/";

      }

  } else {
    alert('Please select at least one recipient list and fill in the subject field!');
  }

});
