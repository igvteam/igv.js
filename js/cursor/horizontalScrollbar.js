/**
 * Created by turner on 9/23/14.
 */
/**
 * Created by turner on 9/19/14.
 */
var cursor = (function (cursor) {

    var minimumHorizontalScrollBarDraggableWidth = 6;

    cursor.HorizontalScrollbar = function (browser, horizontalScrollBarContainer) {

        this.browser = browser;
        this.markupWithParentDivObject(horizontalScrollBarContainer);

    };

    cursor.HorizontalScrollbar.prototype.update = function () {

        var horizontalScrollBarWidth = $(".igv-horizontal-scrollbar-div").first().width(),
            horizontalScrollBarDraggable = $(".igv-horizontal-scrollbar-draggable-div").first(),
            framePixelWidth = this.browser.cursorModel.framePixelWidth,
            regionListLength = this.browser.cursorModel.filteredRegions.length,
            referenceFrame = this.browser.referenceFrame,
            regionBoundsWidth,
            trackLeft,
            horizontalScrollBarDraggableLeft,
            width;

        regionBoundsWidth = framePixelWidth * regionListLength;

        width = Math.max(minimumHorizontalScrollBarDraggableWidth, (horizontalScrollBarWidth/regionBoundsWidth) * horizontalScrollBarWidth);

        trackLeft = referenceFrame.toPixels( referenceFrame.start );
        horizontalScrollBarDraggableLeft = (horizontalScrollBarWidth/regionBoundsWidth) * trackLeft;

        // handle minification with draggable near right edge of scroll bar.
        // must reposition AND scale draggable AND pan track
        if ((horizontalScrollBarDraggableLeft + width) > horizontalScrollBarWidth) {

            // reposition/rescale draggable
            horizontalScrollBarDraggableLeft -= ((horizontalScrollBarDraggableLeft + width) - horizontalScrollBarWidth);
            width = horizontalScrollBarWidth - horizontalScrollBarDraggableLeft;

            // pan track
            referenceFrame.start = referenceFrame.toBP( (regionBoundsWidth/horizontalScrollBarWidth) * horizontalScrollBarDraggableLeft );

            // update
            if (this.browser.ideoPanel) this.browser.ideoPanel.repaint();
            if (this.browser.karyoPanel) this.browser.karyoPanel.repaint();
            this.browser.trackPanels.forEach(function (trackPanel) { trackPanel.update(); });
        }

        $( horizontalScrollBarDraggable).css({
            "left": Math.floor( horizontalScrollBarDraggableLeft ) + "px",
            "width": Math.floor( width ) + "px"
        });

     };

    cursor.HorizontalScrollbar.prototype.markupWithParentDivObject = function (horizontalScrollBarContainer) {

        var myself = this,
            horizontalScrollBar,
            horizontalScrollBarDraggable,
            isMouseDown = undefined,
            lastMouseX = undefined,
            isMouseIn = undefined;

        // DOM
        horizontalScrollBar          = $('<div class="igv-horizontal-scrollbar-div">')[0];
        horizontalScrollBarDraggable = $('<div class="igv-horizontal-scrollbar-draggable-div">')[0];

        $( horizontalScrollBar).css( "left", this.browser.controlPanelWidth + "px");


        horizontalScrollBarContainer.append(horizontalScrollBar);
        $( horizontalScrollBar).css({
            "left": (this.browser.controlPanelWidth ? this.browser.controlPanelWidth : 50) + "px"
        });

        $(horizontalScrollBar).append(horizontalScrollBarDraggable);

        // mouse event handlers
        $( document ).mousedown(function(e) {
            //lastMouseX = e.offsetX;
            lastMouseX = e.screenX;
            isMouseIn = true;
        });

        $( horizontalScrollBarDraggable ).mousedown(function(e) {
            isMouseDown = true;
        });

        $( document ).mousemove(function (e) {

            var maxRegionPixels,
                left;

            if (isMouseDown && isMouseIn && undefined !== lastMouseX) {

                left = $(horizontalScrollBarDraggable).position().left;
                left += (e.screenX - lastMouseX);

                // clamp
                left = Math.max(0, left);
                left = Math.min(($(horizontalScrollBar).width() - $(horizontalScrollBarDraggable).outerWidth()), left);

                $( horizontalScrollBarDraggable).css({
                    "left": left + "px"
                });

                maxRegionPixels = myself.browser.cursorModel.framePixelWidth * myself.browser.cursorModel.filteredRegions.length;
                myself.browser.referenceFrame.start = myself.browser.referenceFrame.toBP(left) * (maxRegionPixels/$(horizontalScrollBar).width());

                // update
                if (myself.browser.ideoPanel) myself.browser.ideoPanel.repaint();
                if (myself.browser.karyoPanel) myself.browser.karyoPanel.repaint();
                myself.browser.trackPanels.forEach(function (trackPanel) { trackPanel.update(); });

                lastMouseX = e.screenX
            }

        });

        $( document ).mouseup(function(e) {
            isMouseDown = false;
            lastMouseX = undefined;
        });

    };

    return cursor;

})(cursor || {});
