/**
 * Created by turner on 9/19/14.
 */
var igv = (function (igv) {

    igv.Popover = function (trackView) {

        this.trackView = trackView;
        this.markupWithParentDiv(trackView.contentDiv);

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

    igv.Popover.prototype.onmousedown = function (event, dx, dy) {

        this.mouseDownX = dx;
        this.mouseDownY = dy;

        $(this.popoverDiv).hide();

    };

    igv.Popover.prototype.onmouseup = function (event, dx, dy) {

        var threshX = dx - this.mouseDownX,
            threshY = dy - this.mouseDownY,
            thresh,
            genomicLocation,
            trackType,
            base,
            refSeqIndex,
            alignmentManager,
            coverageMap,
            refSeq,
            featureDetails;

//        trackType = (this.trackView.track instanceof igv.BAMTrack) ? "BAMTrack " : "UnknownTrack";

        alignmentManager = this.trackView.track.featureSource.alignmentManager;
        if (!alignmentManager) {
            return;
        }

        if (!alignmentManager.coverageMap) {
            return;
        }

        coverageMap = alignmentManager.coverageMap;
        refSeq = coverageMap.refSeq;
        genomicLocation = this.trackView.genomicCoordinateWithEventTap(event);






        refSeqIndex = genomicLocation - coverageMap.bpStart;
        base = refSeq[ refSeqIndex ];

        featureDetails = this.trackView.track.featureDetailsWithHitTest(genomicLocation, dy);

        thresh = Math.floor( Math.sqrt(threshX * threshX + threshY * threshY) );
        if (featureDetails && thresh < 6) {

            this.popoverContentDiv.innerHTML  = featureDetails + "<br>";

            $(this.popoverDiv).css({
                "left": dx + "px",
                "top" : dy + "px"
            }).show();

        }

        this.mouseDownX = this.mouseDownY = undefined;

    };

    return igv;

})(igv || {});
