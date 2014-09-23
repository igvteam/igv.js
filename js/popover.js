/**
 * Created by turner on 9/19/14.
 */
var igv = (function (igv) {

    igv.Popover = function (parent, trackView) {

        this.trackView = trackView;
        this.markupWithParentDiv(parent);

    };

    igv.Popover.prototype.markupWithParentDiv = function (parentDiv) {

        var myself = this,
            popoverDiv,
            popoverContentDiv,
            popoverCloseDiv;

        // popover
        popoverDiv = document.createElement('div');
        parentDiv.appendChild(popoverDiv);
        this.popoverDiv = popoverDiv;

        this.popoverDiv.id = "popover_" + igv.guid();
        this.popoverDiv.className = "popover";

        // popover content
        popoverContentDiv = document.createElement("div");
        this.popoverDiv.appendChild(popoverContentDiv);
        this.popoverContentDiv = popoverContentDiv;

        this.popoverContentDiv.className = "popoverContent";
        this.popoverContentDiv.innerHTML = "blah blah";

        // popover close
        popoverCloseDiv = document.createElement("div");
        this.popoverDiv.appendChild(popoverCloseDiv);
        this.popoverCloseDiv = popoverCloseDiv;

        this.popoverCloseDiv.className = "popoverClose";
        this.popoverCloseDiv.innerHTML = "x";

        this.popoverCloseDiv.onclick = function (e) {

            $(myself.popoverDiv).hide();

        };


    };

    igv.Popover.prototype.hidePopover = function () {

        $(this.popoverDiv).hide();
    };

    igv.Popover.prototype.onmousedown = function (event, dx, dy, popupx, popupy) {

        this.mouseDownX = dx;
        this.mouseDownY = dy;

        $(this.popoverDiv).hide();

    };

    igv.Popover.prototype.onmouseup = function (event, dx, dy, popupx, popupy) {

        var threshX = dx - this.mouseDownX,
            threshY = dy - this.mouseDownY,
            thresh,
            genomicLocation,
            featureDetails;

        genomicLocation = this.trackView.genomicCoordinateWithEventTap(event);
        if (undefined === genomicLocation) {
            return;
        }

        featureDetails = this.trackView.track.featureDetailsWithHitTest(genomicLocation, dy);

        thresh = Math.floor( Math.sqrt(threshX * threshX + threshY * threshY) );
        if (featureDetails && thresh < 6) {

            this.popoverContentDiv.innerHTML  = featureDetails;

            $(this.popoverDiv).css({
                "left": popupx + "px",
                "top" : popupy + "px"
            }).show();

        }

        this.mouseDownX = this.mouseDownY = undefined;

    };

    return igv;

})(igv || {});
