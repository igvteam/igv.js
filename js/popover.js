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
            index,
            packedAlignmentRowIndex,
            alignmentManager = this.trackView.track.featureSource.alignmentManager,
            genomicInterval = alignmentManager.genomicInterval,
            packedAlignments = genomicInterval.packedAlignments,
            coverageMap = alignmentManager.coverageMap,
            refSeq = coverageMap.refSeq;

        trackType = (this.trackView.track instanceof igv.BAMTrack) ? "BAMTrack " : "UnknownTrack";
        genomicLocation = this.trackView.genomicCoordinateWithEventTap(event);

        index = genomicLocation - coverageMap.bpStart;
        base = refSeq[ index ];

        packedAlignmentRowIndex = this.trackView.track.packedAlignmentRowIndexWithScreenYOffset(dy);

        thresh = Math.floor( Math.sqrt(threshX * threshX + threshY * threshY) );
        if (thresh < 6) {

            this.popoverContentDiv.innerHTML = "pa i " + packedAlignmentRowIndex + " pa len " + genomicInterval.packedAlignments.length + " loc " + igv.numberFormatter(genomicLocation) + " refseq " + base;

            $(this.popoverDiv).css({
                "left": dx + "px",
                "top" : dy + "px"
            }).show();

        }

        this.mouseDownX = this.mouseDownY = undefined;

    };

    return igv;

})(igv || {});
