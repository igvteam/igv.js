var igv = (function (igv) {

    igv.TrackFilter = function (trackPanel) {

        this.trackPanel = trackPanel;
        this.guid = igv.guid();
        this.minMaxFilterEnabled = false;
        this.activeTabElement = undefined;
        this.onOffFilterEnabled = undefined;
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
            trackFilterTabSet,
            modalDialogDataTarget,
            closeTrackFilterModal,
            applyTrackFilterModal,
            enableDisableButtonGroupOnOffFilter;

        parentDiv.innerHTML = this.createFilterModalMarkupWithGUID(this.guid);


        // tab set
        trackFilterTabSet = $('#trackFilterTabSet_' + this.guid);

        // set currently active tab
        trackFilterTabSet.find('li').each(function(){

            if ( $( this ).hasClass( "active" ) ) {

                myself.activeTabElement = $(this).find('a')[0];
//                console.log("active tab " + myself.activeTabElement.id);
            }

        });

        // swap tabs
        trackFilterTabSet.find('a').click(function (e) {

            var that = $(this);

            e.preventDefault();

            that.tab('show');

        });

        // tab swap callback
        trackFilterTabSet.find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {

            myself.activeTabElement = $(this)[0];
//            console.log("active tab " + myself.activeTabElement.id);
        });


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



            console.log("tab: " + myself.activeTabElement.id + " minMaxFilterEnabled: " + myself.minMaxFilterEnabled + " onOffFilterEnabled: " + myself.onOffFilterEnabled);












            if (myself.minMaxFilterEnabled) {

                minimumIsNumber = igv.isNumber(minimumValue);
                maximumIsNumber = igv.isNumber(maximumValue);

                filterIconColor = (!minimumIsNumber && !maximumIsNumber) ? "black" : "red";
                $('#' + "modalPresentationButton_" + myself.guid).css( "color", filterIconColor );

                myself.minimum = (minimumIsNumber) ? parseFloat(minimumValue, 10) : undefined;
                myself.maximum = (maximumIsNumber) ? parseFloat(maximumValue, 10) : undefined;

                myself.trackPanel.browser.cursorModel.filterRegions();
            }

        });

        // on/off. enable/disable toggle
        enableDisableButtonGroupOnOffFilter = $('#enableDisableButtonGroupOnOffFilter_' + this.guid + '.btn-toggle');

        enableDisableButtonGroupOnOffFilter.find('.btn').each(function(){

            var toggleSwitchID;

            if ( $( this ).hasClass( "active" ) ) {

                toggleSwitchID = $(this)[ 0 ].id;
                myself.onOffFilterEnabled = (toggleSwitchID === ('enableButtonOnOffFilter_' + myself.guid));
//                console.log("on-off filter enabled " + myself.onOffFilterEnabled);
            }


        });

        enableDisableButtonGroupOnOffFilter.click(function() {

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
                    myself.onOffFilterEnabled = (thang === ('enableButtonOnOffFilter_' + myself.guid));
                }
            });

//            console.log("on-off filter enabled " + myself.onOffFilterEnabled);

        });

        // dismiss filter widget
        closeTrackFilterModal = $('#closeTrackFilterModal_' + this.guid);
        closeTrackFilterModal.on('click', function (e) {

            myself.minMaxFilterEnabled = false;
        });

        // apply filter and dismiss filter widget
        applyTrackFilterModal = $('#applyTrackFilterModal_' + this.guid);
        applyTrackFilterModal.on('click', function (e) {

            myself.minMaxFilterEnabled = true;
        });

    };

    igv.TrackFilter.prototype.createFilterModalMarkupWithGUID = function (guid) {

        var re = new RegExp("GUID","g"),
            filterModalPresentationButtonMarkup,
            filterModalMarkup;

        filterModalPresentationButtonMarkup = this.createFilterModalPresentationButtonMarkupWithGUID(guid);

        filterModalMarkup = '<!-- modal dialog --> <div id="modalDialogDataTarget_GUID" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"> <div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <button id="closeTrackFilterModal_GUID" type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button> <h4 id="modalTitle_GUID" class="modal-title">MODAL_TITLE</h4> </div><!-- /.modal-header --> <div id="modalBody_GUID" class="modal-body"> <ul id="trackFilterTabSet_GUID" class="nav nav-tabs" role="tablist"><!-- Nav tabs --> <li class="active"><a id="trackFilterMinMaxTabLink_GUID" href="#trackFilterMinMaxTab_GUID" role="tab" data-toggle="tab">Min / Max</a></li> <li> <a id="trackFilterOnOffTabLink_GUID" href="#trackFilterOnOffTab_GUID" role="tab" data-toggle="tab">On / Off</a></li> </ul><!-- Nav tabs --> <div class="tab-content"><!-- Tab pane set --> <div id="trackFilterMinMaxTab_GUID" class="tab-pane active"> <div class="spacer20"></div> <div class="container"><!-- container --> <div class="row"><!-- row --> <div class="col-md-3"><!-- column --> <div class="input-group input-group-md"><!-- input group --> <span class="input-group-addon">Minimum</span><input id="minimumScoreFilterID_GUID" type="text" class="form-control" placeholder="Minimum"> </div><!-- input group --> </div><!-- column --> </div><!-- row --> <div class="spacer20"></div> <div class="row"><!-- row --> <div class="col-md-3"><!-- column --> <div class="input-group input-group-md"><!-- input group --> <span class="input-group-addon">Maximum</span><input id="maximumScoreFilterID_GUID" type="text" class="form-control" placeholder="Maximum"> </div><!-- input group --> </div><!-- column --> </div><!-- row --> </div><!-- container --> <div class="spacer10"></div> </div><!-- Tab pane --> <div id="trackFilterOnOffTab_GUID" class="tab-pane"><!-- Tab pane --> <div class="spacer20"></div> <div class="container"><!-- container --> <div class="row"><!-- row --> <div class="col-md-6"><!-- column --> <div id="enableDisableButtonGroupOnOffFilter_GUID" class="btn-group btn-toggle"> <button id= "enableButtonOnOffFilter_GUID" class="btn btn-lg btn-default ">Enable </button> <button id="disableButtonOnOffFilter_GUID" class="btn btn-lg btn-primary active">Disable</button> </div> </div><!-- column --> </div><!-- row --> </div><!-- container --> </div><!-- Tab pane --> </div><!-- Tab pane set --> </div><!-- /.modal-body --> <div class="modal-footer"> <button id="applyTrackFilterModal_GUID" type="button" class="btn btn-default" data-dismiss="modal">Apply</button> </div><!-- /.modal-footer --> </div><!-- /.modal-content --> </div><!-- /.modal-dialog --> </div>';
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
