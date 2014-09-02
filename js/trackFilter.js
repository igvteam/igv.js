/**
 * Created by turner on 6/12/14.
 */
var igv = (function (igv) {

    igv.TrackFilter = function (trackPanel) {

        this.trackPanel = trackPanel;
        this.guid = igv.guid();
        this.doFilter = false;
    };

    igv.TrackFilter.prototype.isNoOp = function () {
        return this.minimum === undefined && this.maximum === undefined;
    };

    igv.TrackFilter.prototype.isIncluded = function (score) {

        var includeMinimum = (undefined === this.minimum) ? true : score >= this.minimum,
            includeMaximum = (undefined === this.maximum) ? true : score <= this.maximum;

        return (includeMinimum && includeMaximum);
    };

    // Markup
    igv.TrackFilter.prototype.createTrackFilterWidgetWithParentElement = function (parentDiv) {

        var myself = this;

        parentDiv.innerHTML = this.createModalDialogWithGUID(this.guid);

        $('#' + this.guid + "_dataTarget").on('hidden.bs.modal', function (e) {

            var minimumIsNumber,
                maximumIsNumber,
                minimumValue = $('#minimum_' + myself.guid).val(),
                maximumValue = $('#maximum_' + myself.guid).val(),
                filterIconColor;

            if (myself.doFilter) {

                minimumIsNumber = igv.isNumber(minimumValue);
                maximumIsNumber = igv.isNumber(maximumValue);

                filterIconColor = (!minimumIsNumber && !maximumIsNumber) ? "black" : "red";
                $('#' + myself.guid + "_modalPresentationButton").css( "color", filterIconColor );

                myself.minimum = (minimumIsNumber) ? parseFloat(minimumValue, 10) : undefined;
                myself.maximum = (maximumIsNumber) ? parseFloat(maximumValue, 10) : undefined;

                myself.trackPanel.browser.cursorModel.filterRegions();
            }

        });

        $('#' + this.guid + "_modalCloseButton").on('click', function (e) {

            myself.doFilter = false;
        });

        $('#' + this.guid + "_modalApplyButton").on('click', function (e) {

            myself.doFilter = true;
        });

    };

    igv.TrackFilter.prototype.createModalDialogWithGUID = function (guid) {

        var modalPresentationButton = this.modalPresentationButton(guid);

        var modalDialog = '<div class="modal fade" id="MODAL_DATA_TARGET" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"> <div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" id="MODAL_CLOSE_BUTTON" data-dismiss="modal" aria-hidden="true">&times;</button> <h4 class="modal-title" id="myModalLabel">MODAL_TITLE</h4> </div><!-- /.modal-header --> <div class="modal-body" id="MODAL_BODY"> <div class="container"> <div class="row"> <div class="col-md-1"> <label>Minimum</label> </div> <div class="col-md-2"> <input type="text" id="minimum_TRACK_LABEL" class="form-control" placeholder="Minimum"> </div> </div> <div class="spacer10"></div> <div class="row"> <div class="col-md-1"> <label>Maximum</label> </div> <div class="col-md-2"> <input type="text" id="maximum_TRACK_LABEL" class="form-control" placeholder="Maximum"> </div> </div> </div> </div><!-- /.modal-body --> <div class="modal-footer"> <button type="button" class="btn btn-default" id="MODAL_APPLY_BUTTON" data-dismiss="modal">Apply</button> </div><!-- /.modal-footer --> </div><!-- /.modal-content --> </div><!-- /.modal-dialog --> </div>';
        modalDialog = modalDialog.replace("MODAL_DATA_TARGET", guid + "_dataTarget");
        modalDialog = modalDialog.replace("MODAL_BODY", guid + "_modalBody");
        modalDialog = modalDialog.replace("MODAL_TITLE", this.trackPanel.track.label + " Filter");

        // close button
        modalDialog = modalDialog.replace("MODAL_CLOSE_BUTTON", guid + "_modalCloseButton");

        // apply button
        modalDialog = modalDialog.replace("MODAL_APPLY_BUTTON", guid + "_modalApplyButton");

        var re = new RegExp("TRACK_LABEL","g");
        modalDialog = modalDialog.replace(re, guid);

        return modalPresentationButton + modalDialog;
    };

    igv.TrackFilter.prototype.modalPresentationButton = function (guid) {

        var modalPresentationButton = '<i id="MODAL_PRESENTATION_BUTTON" class="fa fa-filter" data-toggle="modal" data-target="#MODAL_DATA_TARGET" style="color: black; position: absolute; top: 0px; left: 0px; cursor: pointer;"></i>';
        modalPresentationButton = modalPresentationButton.replace("MODAL_PRESENTATION_BUTTON", guid + "_modalPresentationButton");
        modalPresentationButton = modalPresentationButton.replace("MODAL_DATA_TARGET", guid + "_dataTarget");

        return modalPresentationButton;
    };


    return igv;

})(igv || {});
