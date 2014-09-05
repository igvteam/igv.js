
$(document).ready(function(){

    var enableDisableButtonGroupOnOffFilter = $('#enableDisableButtonGroupOnOffFilter_GUID');

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


});