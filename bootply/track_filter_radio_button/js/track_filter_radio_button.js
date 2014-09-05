
$(document).ready(function(){

    var enableDisableButtonGroupOnOffFilter = $('#enableDisableButtonGroupOnOffFilter_GUID'),
        radioButtonGroupContainer = $('#modalBody_GUID').find('.radio');

    enableDisableButtonGroupOnOffFilter.click(function() {

        var thang = $(this),
            toggleSwitchButtonPair = thang.find('.btn');

        toggleSwitchButtonPair.toggleClass('active');

        if (thang.find('.btn-primary').size() > 0) {
            toggleSwitchButtonPair.toggleClass('btn-primary');
        }

        toggleSwitchButtonPair.toggleClass('btn-default');

        console.log("toggle");

    });

    radioButtonGroupContainer.click(function() {

        var radio = $(this).find('input')[0];

        console.log("radio " + radio.id);
    });

});