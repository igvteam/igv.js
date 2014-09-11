var igv;
igv = (function (igv) {

    igv.TrackFilter = function (trackPanel) {

        this.trackPanel = trackPanel;
        this.guid = igv.guid();
        this.doEvaluateFilter = false;
        this.isFilterActive = true;
        this.radioButton = undefined;
    };

    igv.TrackFilter.prototype.makeTrackFilterOverlayRenderer = function (cursorHistogramRenderMinimumOverlay, cursorHistogramRenderMaximumOverlay) {

        var myself = this,
            trackFilterOverlayRenderer = function () {

                // do nothing
//                console.log("nothing to see here");

            };

        if ("minMaxRadio_" + this.guid === this.radioButton.id) {

            trackFilterOverlayRenderer = function () {

                if (myself.minimum) {
                    cursorHistogramRenderMinimumOverlay(myself.minimum);
                }

                if (myself.maximum) {
                    cursorHistogramRenderMaximumOverlay(myself.maximum);
                }

            };


        }

        return trackFilterOverlayRenderer;
    };

    igv.TrackFilter.prototype.onHideModalEvaluateFilter = function () {

        var modalPresentationButton = $('#' + "modalPresentationButton_" + this.guid),
            minimumElement = $('#' + 'minimumScoreFilterID_' + this.guid),
            maximumElement = $('#' + 'maximumScoreFilterID_' + this.guid);

        this.minimum = igv.isNumber(minimumElement.val()) ? parseFloat(minimumElement.val(), 10) : undefined;
        this.maximum = igv.isNumber(maximumElement.val()) ? parseFloat(maximumElement.val(), 10) : undefined;

        if (!this.isFilterActive) {
            this.trackPanel.browser.cursorModel.filterRegions();
            return;
        }

        if ("minMaxRadio_" + this.guid === this.radioButton.id) {

            if (undefined === this.minimum && undefined === this.maximum) {
                modalPresentationButton.css("color", "black");
            }

        } else {
            modalPresentationButton.css("color", (this.doEvaluateFilter) ? "red" : "black");
        }

        if (this.doEvaluateFilter) {
            this.trackPanel.browser.cursorModel.filterRegions();
        }

    };

    igv.TrackFilter.prototype.evaluate = function (featureCache, region, regionWidth) {

        var score = region.getScore(featureCache, regionWidth);

        if ("minMaxRadio_" + this.guid === this.radioButton.id) {

            return this.isIncluded(score);

        } else if ("regionContainsFeatureRadio_" + this.guid === this.radioButton.id) {

            return -1 !== score;

        } else if ("regionLacksFeatureRadio_" + this.guid === this.radioButton.id) {

            return -1 === score;

        }

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
            modalPresentationButton,
            modalDialogDataTarget,
            closeTrackFilterModal,
            applyTrackFilterModal,
            radioButtonGroupContainer;

        parentDiv.innerHTML = this.createFilterModalMarkupWithGUID(this.guid);


        // min/max
        modalDialogDataTarget = $('#modalDialogDataTarget_' + this.guid);

        modalDialogDataTarget.on('hidden.bs.modal', function (e) {

            myself.onHideModalEvaluateFilter();
        });

        // initialize chosen radio button
        radioButtonGroupContainer = $('#modalBody_' + this.guid).find('.radio');
        myself.radioButton = chosenRadioButton(radioButtonGroupContainer);

        modalPresentationButton = $('#' + "modalPresentationButton_" + this.guid);
        radioButtonGroupContainer.click(function () {

            myself.radioButton = $(this).find('input')[0];
            myself.isFilterActive = myself.radioButton.id !== "inActiveFilterRadio_" + myself.guid;
            if (!myself.isFilterActive) {
                modalPresentationButton.css("color", "black");
            }

        });

        // dismiss filter widget
        closeTrackFilterModal = $('#closeTrackFilterModal_' + this.guid);
        closeTrackFilterModal.on('click', function (e) {

            myself.doEvaluateFilter = false;
        });

        // apply filter and dismiss filter widget
        applyTrackFilterModal = $('#applyTrackFilterModal_' + this.guid);
        applyTrackFilterModal.on('click', function (e) {

            myself.doEvaluateFilter = true;
        });

        function chosenRadioButton(radioButtonGroupContainer) {

            var chosen = undefined;

            radioButtonGroupContainer.each(function(){

                var radio = $(this).find('input')[0];

                if (radio.checked) {
                    chosen = radio;
//                    console.log("radio " + radio.id + " " + radio.checked);
                }

            });

            return chosen;
        }

    };

    igv.TrackFilter.prototype.createFilterModalMarkupWithGUID = function (guid) {

        var re = new RegExp("GUID", "g"),
            filterModalPresentationButtonMarkup,
            filterModalMarkup;

        filterModalPresentationButtonMarkup = this.createFilterModalPresentationButtonMarkupWithGUID(guid);

        filterModalMarkup = '<!-- modal dialog --> <div id="modalDialogDataTarget_GUID" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"> <div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <button id="closeTrackFilterModal_GUID" type="button" class="close" data-dismiss="modal" aria-hidden="true"> × </button> </div><!-- /.modal-header --> <div id="modalBody_GUID" class="modal-body"> <div class="radio"> <!--<div class="spacer10"></div>--> <div> <label> <input id="minMaxRadio_GUID" type="radio" name="trackFilterRadioButtonGroup_GUID" value="option1" checked> Regions containing features whose scores are bounded my min and max </label> </div> <div class="spacer20"></div> <div class="container"><!-- min/max container --> <div class="row"><!-- row --> <div class="col-md-3"><!-- column --> <div class="input-group input-group-md"><!-- minimumScore input group --> <span class="input-group-addon">Minimum</span> <input id="minimumScoreFilterID_GUID" type="text" class="form-control" placeholder="Minimum"> </div><!-- minimumScore input group --> </div><!-- column --> </div><!-- row --> <div class="spacer20"></div> <div class="row"><!-- row --> <div class="col-md-3"><!-- column --> <div class="input-group input-group-md"><!-- maximumScore input group --> <span class="input-group-addon">Maximum</span> <input id="maximumScoreFilterID_GUID" type="text" class="form-control" placeholder="Maximum"> </div><!-- maximumScore input group --> </div><!-- column --> </div><!-- row --> </div><!-- min/max container --> <div class="spacer10"></div> </div> <hr> <div class="radio"> <div class="spacer5"></div> <label> <input id="regionContainsFeatureRadio_GUID" type="radio" name="trackFilterRadioButtonGroup_GUID" value="option2"> Regions that contain features </label> <div class="spacer5"></div> </div> <hr> <div class="radio"> <div class="spacer5"></div> <label> <input id="regionLacksFeatureRadio_GUID" type="radio" name="trackFilterRadioButtonGroup_GUID" value="option3"> Regions that do not contain features </label> <div class="spacer5"></div> </div> <hr> <div class="radio"> <div class="spacer5"></div> <label> <input id="inActiveFilterRadio_GUID" type="radio" name="trackFilterRadioButtonGroup_GUID" value="option4"> Filter is inactive </label> <div class="spacer5"></div> </div> </div><!-- /.modal-body --> <div class="modal-footer"> <button id="applyTrackFilterModal_GUID" type="button" class="btn btn-default" data-dismiss="modal">Apply</button> </div><!-- /.modal-footer --> </div><!-- /.modal-content --> </div><!-- /.modal-dialog --> </div>';
        filterModalMarkup = filterModalMarkup.replace(re, guid);

        return filterModalPresentationButtonMarkup + filterModalMarkup;
    };

    igv.TrackFilter.prototype.createFilterModalPresentationButtonMarkupWithGUID = function (guid) {

        var re = new RegExp("GUID", "g"),
            presentationButton;

        presentationButton = '<i id="modalPresentationButton_GUID" class="fa fa-filter" data-toggle="modal" data-target="#modalDialogDataTarget_GUID" style="color: black; position: absolute; top: 0; left: 0; cursor: pointer;"></i>';
        presentationButton = presentationButton.replace(re, guid);

        return presentationButton;
    };

    return igv;

})(igv || {});
