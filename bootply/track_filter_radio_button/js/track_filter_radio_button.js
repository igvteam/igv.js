
$(document).ready(function(){

    var isFilterActiveToggleSwitch = $('#isFilterActiveToggleSwitch_GUID'),
        radioButtonGroupContainer = $('#modalBody_GUID').find('.radio');

    isFilterActiveToggleSwitch.click(function() {

        var buttonGroup = $(this),
            toggleSwitchButtonPair = buttonGroup.find('.btn');

        toggleSwitchButtonPair.toggleClass('active');

        if (buttonGroup.find('.btn-primary').size() > 0) {
            toggleSwitchButtonPair.toggleClass('btn-primary');
        }

        toggleSwitchButtonPair.toggleClass('btn-default');

        toggleSwitchButtonPair.each(function(){

            var thang;

            if ( $( this ).hasClass( "active" ) ) {

                thang = $(this)[ 0 ].id;
                myself.isFilterActive = (thang === ('isActiveButton_GUID'));
            }
        });

        console.log("on-off filter enabled " + myself.isFilterActive);

    });

    radioButtonGroupContainer.click(function() {

        var radio = $(this).find('input')[0];

        console.log("radio " + radio.id);
    });

});