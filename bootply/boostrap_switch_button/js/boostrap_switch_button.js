
$(document).ready(function(){

    $('.btn-toggle').click(function() {

        var thang = $(this),
            toggleButtonPair = thang.find('.btn');

        toggleButtonPair.toggleClass('active');

        if (thang.find('.btn-primary').size()>0) {
            toggleButtonPair.toggleClass('btn-primary');
        }

        if (thang.find('.btn-danger').size()>0) {
            toggleButtonPair.toggleClass('btn-danger');
        }

        if (thang.find('.btn-success').size()>0) {
            toggleButtonPair.toggleClass('btn-success');
        }

        if (thang.find('.btn-info').size()>0) {
            toggleButtonPair.toggleClass('btn-info');
        }

        toggleButtonPair.toggleClass('btn-default');

    });

    $('form').submit(function(){

        alert($(this["options"]).val());
        return false;
    });

});