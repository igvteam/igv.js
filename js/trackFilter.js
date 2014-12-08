/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var igv;
igv = (function (igv) {

    igv.TrackFilter = function (trackPanel) {

        this.trackPanel = trackPanel;
        this.guid = igv.guid();
        this.isFilterActive = false;
        this.previousRadioButton = undefined;
        this.radioButton = undefined;
    };

    igv.TrackFilter.prototype.setWithJSON = function (json) {

        var myself = this,
            modalPresentationButton = $('#' + "modalPresentationButton_" + this.guid),
            minimumElement = $('#' + 'minimumScoreFilterID_' + this.guid),
            maximumElement = $('#' + 'maximumScoreFilterID_' + this.guid);

        this.isFilterActive = json.isFilterActive;
        this.radioButton = (undefined === json.radioButtonIDPrefix) ? undefined : radioButtonWithID(json.radioButtonIDPrefix + this.guid);

        if ("minMaxRadio_" + this.guid === this.radioButton[0].id) {

            minimumElement.val(json.minimum);
            maximumElement.val(json.maximum);

            this.minimum = json.minimum;
            this.maximum = json.maximum;

            if (undefined !== json.minimum || undefined !== json.maximum) {

                modalPresentationButton.addClass("igv-trackfilter-fa-selected");
            }

        } else if (this.isFilterActive) {

            modalPresentationButton.addClass("igv-trackfilter-fa-selected");
        }

        function radioButtonWithID(radioButtonID) {

            var chosen = undefined,
                radioButtonGroupContainer = $('#modalBody_' + myself.guid).find('.radio');

            radioButtonGroupContainer.each(function(){

                var radio = $(this).find('input');

                if (radioButtonID === radio[ 0 ].id) {
                    chosen = radio;
                    chosen.prop('checked',true);
                }

            });

            return chosen;
        }

    };

    igv.TrackFilter.prototype.jsonRepresentation = function () {

        var re = new RegExp(this.guid, "g"),
            json;

        json = {
            isFilterActive: this.isFilterActive,
            radioButtonIDPrefix : (undefined == this.radioButton[0]) ? undefined : this.radioButton[0].id.replace(re, ''),
            minimum : (undefined === this.minimum) ? undefined : this.minimum,
            maximum : (undefined === this.maximum) ? undefined : this.maximum

        };

        return json;
    };

    igv.TrackFilter.prototype.makeTrackFilterOverlayRenderer = function (cursorHistogramRenderMinimumOverlay, cursorHistogramRenderMaximumOverlay) {

        var myself = this,
            trackFilterOverlayRenderer = function () {

                // do nothing
//                console.log("nothing to see here");

            };

        if ("minMaxRadio_" + this.guid === this.radioButton[0].id) {

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

    igv.TrackFilter.prototype.doEvaluateFilter = function () {

        var modalPresentationButton = $('#' + "modalPresentationButton_" + this.guid),
            minimumElement = $('#' + 'minimumScoreFilterID_' + this.guid),
            maximumElement = $('#' + 'maximumScoreFilterID_' + this.guid);

        // This will undo this filter if previously set
        if (!this.isFilterActive) {

            modalPresentationButton.removeClass("igv-trackfilter-fa-selected");

            this.trackPanel.browser.cursorModel.filterRegions();
            return;
        }

        modalPresentationButton.addClass("igv-trackfilter-fa-selected");

        if ("minMaxRadio_" + this.guid === this.radioButton[0].id) {

            this.minimum = igv.isNumber(minimumElement.val()) ? parseFloat(minimumElement.val(), 10) : undefined;
            this.maximum = igv.isNumber(maximumElement.val()) ? parseFloat(maximumElement.val(), 10) : undefined;

            if (undefined === this.minimum && undefined === this.maximum) {

                modalPresentationButton.removeClass("igv-trackfilter-fa-selected");
            }
        }

        this.trackPanel.browser.cursorModel.filterRegions();

    };

    igv.TrackFilter.prototype.evaluate = function (featureCache, region, regionWidth) {

        var score = region.getScore(featureCache, regionWidth);

        if ("minMaxRadio_" + this.guid === this.radioButton[0].id) {

            return this.isIncluded(score);

        } else if ("regionContainsFeatureRadio_" + this.guid === this.radioButton[0].id) {

            return -1 !== score;

        } else if ("regionLacksFeatureRadio_" + this.guid === this.radioButton[0].id) {

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
            radioButtonGroupContainer,
            modalDialogCallback;

        parentDiv.innerHTML = this.createFilterModalMarkupWithGUID(this.guid);

        // min/max
        modalDialogDataTarget = $('#modalDialogDataTarget_' + this.guid);

        modalDialogDataTarget.on('shown.bs.modal', function (e) {

            myself.previousRadioButton = myself.radioButton;

            modalDialogCallback = function () {

                // undo radio button if needed
                myself.radioButton = myself.previousRadioButton;
                myself.radioButton.prop('checked',true);

            };

        });

        modalDialogDataTarget.on('hidden.bs.modal', function (e) {

            modalDialogCallback();

        });

        // initialize chosen radio button
        radioButtonGroupContainer = $('#modalBody_' + this.guid).find('.radio');
        myself.radioButton = chosenRadioButton(radioButtonGroupContainer);

        modalPresentationButton = $('#' + "modalPresentationButton_" + this.guid);
        radioButtonGroupContainer.click(function () {

            // Remember previous radio button so we can undo
            myself.previousRadioButton = myself.radioButton;
            myself.radioButton = $(this).find('input');

        });

        // dismiss filter widget
        closeTrackFilterModal = $('#closeTrackFilterModal_' + this.guid);
        closeTrackFilterModal.on('click', function (e) {

        });

        // apply filter and dismiss filter widget
        applyTrackFilterModal = $('#applyTrackFilterModal_' + this.guid);
        applyTrackFilterModal.on('click', function (e) {

            modalDialogCallback = function () {

                myself.isFilterActive = !(myself.radioButton[0].id === "inActiveFilterRadio_" + myself.guid);
                myself.doEvaluateFilter();
            };

        });

        function chosenRadioButton(radioButtonGroupContainer) {

            var chosen = undefined;

            radioButtonGroupContainer.each(function(){

                var radio = $(this).find('input');

                if (radio[0].checked) {
                    chosen = radio;
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

        filterModalMarkup = '<!-- modal dialog --> <div id="modalDialogDataTarget_GUID" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"> <div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <div class="spacer20"></div> <h4> Display only regions that meet the criteria: </h4> <div class="spacer20"></div> </div><!-- /.modal-header --> <div id="modalBody_GUID" class="modal-body"> <div class="radio"> <div class="spacer5"></div> <label> <input id="inActiveFilterRadio_GUID" type="radio" name="trackFilterRadioButtonGroup_GUID" value="option4"> All regions </label> <div class="spacer5"></div> </div><!-- radio - all regions --> <hr> <div class="radio"> <div> <label> <input id="minMaxRadio_GUID" type="radio" name="trackFilterRadioButtonGroup_GUID" value="option1" checked> Regions that contain features whose scores are bounded by min and max </label> </div> <div class="spacer20"></div> <div class="container"> <div class="row"><!-- row --> <div class="col-md-3"><!-- column --> <div class="input-group input-group-md"><!-- maximumScore input group --> <span class="input-group-addon">Maximum</span> <input id="maximumScoreFilterID_GUID" type="text" class="form-control" placeholder=""> </div><!-- maximumScore input group --> </div><!-- column --> </div><!-- maximum row --> <div class="spacer20"></div> <div class="row"><!-- row --> <div class="col-md-3"><!-- column --> <div class="input-group input-group-md"><!-- minimumScore input group --> <span class="input-group-addon">Minimum</span> <input id="minimumScoreFilterID_GUID" type="text" class="form-control" placeholder=""> </div><!-- minimumScore input group --> </div><!-- column --> </div><!-- minimum row --> </div><!-- min/max container --> </div><!-- radio - regions are bounded by min/max --> <hr> <div class="radio"> <div class="spacer5"></div> <label> <input id="regionContainsFeatureRadio_GUID" type="radio" name="trackFilterRadioButtonGroup_GUID" value="option2"> Regions that contain features </label> <div class="spacer5"></div> </div><!-- radio - regions that contain features --> <hr> <div class="radio"> <div class="spacer5"></div> <label> <input id="regionLacksFeatureRadio_GUID" type="radio" name="trackFilterRadioButtonGroup_GUID" value="option3"> Regions that do not contain features </label> <div class="spacer5"></div> </div><!-- radio - regions that do not contain features --> </div><!-- /.modal-body --> <div class="modal-footer"> <button id="closeTrackFilterModal_GUID" type="button" class="btn btn-default" data-dismiss="modal">Cancel</button> <button id="applyTrackFilterModal_GUID" type="button" class="btn btn-primary" data-dismiss="modal">Apply</button> </div><!-- /.modal-footer --> </div><!-- /.modal-content --> </div><!-- /.modal-dialog --> </div>';
        filterModalMarkup = filterModalMarkup.replace(re, guid);

        return filterModalPresentationButtonMarkup + filterModalMarkup;
    };

    igv.TrackFilter.prototype.createFilterModalPresentationButtonMarkupWithGUID = function (guid) {

        var re = new RegExp("GUID", "g"),
            presentationButton;

//        presentationButton = '<i id="modalPresentationButton_GUID" class="fa fa-filter" data-toggle="modal" data-target="#modalDialogDataTarget_GUID" style="color: black; position: absolute; top: 0; left: 0; cursor: pointer;"></i>';
        presentationButton = '<i id="modalPresentationButton_GUID" class="glyphicon glyphicon-filter igv-trackfilter-fa" data-toggle="modal" data-target="#modalDialogDataTarget_GUID"></i>';

        presentationButton = presentationButton.replace(re, guid);

        return presentationButton;
    };

    return igv;

})(igv || {});
