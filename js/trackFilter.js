var igv = (function (igv) {

    igv.TrackFilter = function (trackPanel) {

        this.trackPanel = trackPanel;
        this.guid = igv.guid();
        this.doFilter = false;
        this.isFilterActive = true;
    };

    igv.TrackFilter.prototype.onOff = function (score) {
        return -1 === score;
    };

    igv.TrackFilter.prototype.isNoOp = function () {
        return undefined === this.minimum && undefined === this.maximum;
    };

    igv.TrackFilter.prototype.isIncluded = function (score) {

        var includeMinimum,
            includeMaximum;

        includeMinimum = (undefined === this.minimum) ? true : score >= this.minimum;
        includeMaximum = (undefined === this.maximum) ? true : score <= this.maximum;

        return (includeMinimum && includeMaximum);
    };

    igv.TrackFilter.prototype.createTrackFilterWidgetWithParentElement = function (parentDiv) {

        var myself = this,
            modalDialogDataTarget,
            closeTrackFilterModal,
            applyTrackFilterModal,
            isFilterActiveToggleSwitch,
            radioButtonGroupContainer;

        parentDiv.innerHTML = this.createFilterModalMarkupWithGUID(this.guid);


        // min/max
        modalDialogDataTarget = $('#modalDialogDataTarget_' + this.guid);

        // TODO: Currently called after close or apply button click.
        // TODO: Make this generic to handle filtering for either
        // TODO: tab.
        modalDialogDataTarget.on('hidden.bs.modal', function (e) {

            var minimumIsNumber,
                maximumIsNumber,
                minimumValue = $('#' + 'minimumScoreFilterID_' + myself.guid).val(),
                maximumValue = $('#' + 'maximumScoreFilterID_' + myself.guid).val(),
                filterIconColor;

            console.log("filterEnabledd: " + myself.doFilter);

            if (myself.doFilter) {

                minimumIsNumber = igv.isNumber(minimumValue);
                maximumIsNumber = igv.isNumber(maximumValue);

                filterIconColor = (!minimumIsNumber && !maximumIsNumber) ? "black" : "red";
                $('#' + "modalPresentationButton_" + myself.guid).css( "color", filterIconColor );

                myself.minimum = (minimumIsNumber) ? parseFloat(minimumValue, 10) : undefined;
                myself.maximum = (maximumIsNumber) ? parseFloat(maximumValue, 10) : undefined;

                myself.trackPanel.browser.cursorModel.filterRegions();
            }

        });

        // active/inactive filter toggle switch
        isFilterActiveToggleSwitch = $('#isFilterActiveToggleSwitch_' + this.guid);

        isFilterActiveToggleSwitch.find('.btn').each(function(){

            var toggleSwitchID;

            if ( $( this ).hasClass( "active" ) ) {

                toggleSwitchID = $(this)[ 0 ].id;
                myself.isFilterActive = (toggleSwitchID === ('isActiveButton_' + myself.guid));
                console.log("on-off filter enabled " + myself.isFilterActive);
            }


        });

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
                    myself.isFilterActive = (thang === ('isActiveButton_' + myself.guid));
                }
            });

            console.log("on-off filter enabled " + myself.isFilterActive);

        });

        // radio button group
        radioButtonGroupContainer = $('#modalBody_' + this.guid).find('.radio');

        radioButtonGroupContainer.each(function(){

            var radio = $(this).find('input')[0];

            console.log("radio " + radio.id + " " + radio.checked);
        });

        radioButtonGroupContainer.click(function() {

            var radio = $(this).find('input')[0];

            console.log("radio " + radio.id + " " + radio.checked);
        });

        // dismiss filter widget
        closeTrackFilterModal = $('#closeTrackFilterModal_' + this.guid);
        closeTrackFilterModal.on('click', function (e) {

            radioButtonGroupContainer.each(function(){

                var radio = $(this).find('input')[0];

                console.log("radio " + radio.id + " " + radio.checked);
            });

            myself.doFilter = false;
        });

        // apply filter and dismiss filter widget
        applyTrackFilterModal = $('#applyTrackFilterModal_' + this.guid);
        applyTrackFilterModal.on('click', function (e) {

            myself.doFilter = true;
        });

    };

    igv.TrackFilter.prototype.createFilterModalMarkupWithGUID = function (guid) {

        var re = new RegExp("GUID","g"),
            filterModalPresentationButtonMarkup,
            filterModalMarkup;

        filterModalPresentationButtonMarkup = this.createFilterModalPresentationButtonMarkupWithGUID(guid);

        filterModalMarkup = '<!-- modal dialog --> <div id="modalDialogDataTarget_GUID" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"> <div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <div id="isFilterActiveToggleSwitch_GUID" class="btn-group btn-toggle"> <button id="isActiveButton_GUID" class="btn btn-xs btn-primary active">Active </button> <button id="isInActiveButton_GUID" class="btn btn-xs btn-default" >Inactive</button> </div> <button id="closeTrackFilterModal_GUID" type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button> </div><!-- /.modal-header --> <div id="modalBody_GUID" class="modal-body"> <div class="radio"> <!--<div class="spacer10"></div>--> <div> <label> <input id="minMaxRadio_GUID" type="radio" name="trackFilterRadioButtonGroup" value="option1" checked="checked"> Regions containing features whose scores are bounded my min and max </label> </div> <div class="spacer20"></div> <div class="container"><!-- min/max container --> <div class="row"><!-- row --> <div class="col-md-3"><!-- column --> <div class="input-group input-group-md"><!-- minimumScore input group --> <span class="input-group-addon">Minimum</span> <input id="minimumScoreFilterID_GUID" type="text" class="form-control" placeholder="Minimum"> </div><!-- minimumScore input group --> </div><!-- column --> </div><!-- row --> <div class="spacer20"></div> <div class="row"><!-- row --> <div class="col-md-3"><!-- column --> <div class="input-group input-group-md"><!-- maximumScore input group --> <span class="input-group-addon">Maximum</span> <input id="maximumScoreFilterID_GUID" type="text" class="form-control" placeholder="Maximum"> </div><!-- maximumScore input group --> </div><!-- column --> </div><!-- row --> </div><!-- min/max container --> <div class="spacer10"></div> </div> <hr> <div class="radio"> <div class="spacer5"></div> <label> <input id="regionContainsFeatureRadio_GUID" type="radio" name="trackFilterRadioButtonGroup" value="option2"> Regions that contain features </label> <div class="spacer5"></div> </div> <hr> <div class="radio"> <div class="spacer5"></div> <label> <input id="regionLacksFeatureRadio_GUID" type="radio" name="trackFilterRadioButtonGroup" value="option3"> Regions that do not contain features </label> <div class="spacer5"></div> </div> </div><!-- /.modal-body --> <div class="modal-footer"> <button id="applyTrackFilterModal_GUID" type="button" class="btn btn-default" data-dismiss="modal">Apply</button> </div><!-- /.modal-footer --> </div><!-- /.modal-content --> </div><!-- /.modal-dialog --> </div>';
        filterModalMarkup = filterModalMarkup.replace(re, guid);

        return filterModalPresentationButtonMarkup + filterModalMarkup;
    };

    igv.TrackFilter.prototype.createFilterModalPresentationButtonMarkupWithGUID = function (guid) {

        var re = new RegExp("GUID","g"),
            presentationButton;

        presentationButton = '<i id="modalPresentationButton_GUID" class="fa fa-filter" data-toggle="modal" data-target="#modalDialogDataTarget_GUID" style="color: black; position: absolute; top: 0; left: 0; cursor: pointer;"></i>';
        presentationButton = presentationButton.replace(re, guid);

        return presentationButton;
    };

    return igv;

})(igv || {});
