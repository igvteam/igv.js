/**
 * Created by turner on 9/23/14.
 */
/**
 * Created by turner on 9/19/14.
 */
var cursor = (function (cursor) {

    cursor.HorizontalScrollbar = function (browser, parentDivObject) {

        this.browser = browser;
        this.markupWithParentDivObject(parentDivObject);

    };

    cursor.HorizontalScrollbar.prototype.update = function () {

        var horizontalScrollBarWidth = $(".igv-horizontal-scrollbar-div").first().width(),
            horizontalScrollBarDraggable = $(".igv-horizontal-scrollbar-draggable-div").first(),
            maxRegionPixels,
            trackLeft,
            horizontalScrollBarDraggableLeft,
            width;

        maxRegionPixels = this.browser.cursorModel.framePixelWidth * this.browser.cursorModel.filteredRegions.length;

        width = (horizontalScrollBarWidth/maxRegionPixels) * horizontalScrollBarWidth;
        width = Math.max(5, width);

        trackLeft = this.browser.referenceFrame.toPixels( this.browser.referenceFrame.start );
        horizontalScrollBarDraggableLeft = (horizontalScrollBarWidth/maxRegionPixels) * trackLeft;

        if ((horizontalScrollBarDraggableLeft + width) > horizontalScrollBarWidth) {

            horizontalScrollBarDraggableLeft -= ((horizontalScrollBarDraggableLeft + width) - horizontalScrollBarWidth);
            width = horizontalScrollBarWidth - horizontalScrollBarDraggableLeft;

            this.browser.referenceFrame.start = this.browser.referenceFrame.toBP( (maxRegionPixels/horizontalScrollBarWidth) * horizontalScrollBarDraggableLeft );

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

    cursor.HorizontalScrollbar.prototype.markupWithParentDivObject = function (parentDivObject) {

        var myself = this,
            horizontalScrollBarContainer,
            horizontalScrollBar,
            horizontalScrollBarDraggable,
            isMouseDown = undefined,
            lastMouseX = undefined,
            isMouseIn = undefined;

        // DOM
        horizontalScrollBarContainer = $('<div class="igv-horizontal-scrollbar-container-div">')[0];
        horizontalScrollBar          = $('<div class="igv-horizontal-scrollbar-div">')[0];
        horizontalScrollBarDraggable = $('<div class="igv-horizontal-scrollbar-draggable-div">')[0];

        $( horizontalScrollBar).css( "left", this.browser.controlPanelWidth + "px");


        parentDivObject.append(horizontalScrollBarContainer);
        $(horizontalScrollBarContainer).append(horizontalScrollBar);
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
