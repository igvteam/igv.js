
$(document).ready(function(){

    var radioButtonGroupContainer = $('#modalBody_GUID').find('.radio');

    radioButtonGroupContainer.click(function() {

        var radio = $(this).find('input')[0];

        console.log("radio " + radio.id);
    });

});