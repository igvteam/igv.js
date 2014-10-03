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

    cursor.HorizontalScrollbar.prototype.update = function (cursorModel, referenceFrame) {

        var horizontalScrollBarWidth = $(".igv-horizontal-scrollbar-div").first().width(),
            horizontalScrollBarDraggable = $(".igv-horizontal-scrollbar-draggable-div").first(),
            regionListLength = cursorModel.regionsToRender().length,
            regionsOnScreen,
            left,
            width;

        // It is possible that horizontalScrollBarWidth/framePixelWidth results in a region count larger
        // then the regionListLength so we need to clamp.
        regionsOnScreen = Math.min(regionListLength, horizontalScrollBarWidth / cursorModel.framePixelWidth);

        width = (regionsOnScreen/regionListLength) * horizontalScrollBarWidth;

        left = referenceFrame.toPixels( referenceFrame.start );
        left *= (width / horizontalScrollBarWidth);

        $( horizontalScrollBarDraggable).css({
            "left": Math.floor( left ) + "px",
            "width": Math.floor( width ) + "px"
        });

        console.log("regions - on screen " + Math.floor(regionsOnScreen) + " total " + regionListLength);

     };

    cursor.HorizontalScrollbar.prototype.markupWithParentDivObject = function (parentDivObject) {

        var horizontalScrollBarContainer,
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

            var dx,
                left;

            dx = e.screenX - lastMouseX;

            left = $( horizontalScrollBarDraggable).position().left;

            if (isMouseDown && isMouseIn && undefined !== lastMouseX) {

                left += dx;

                // constrain raw displacement to horizontal scroll bar bbox
                left = Math.max(0, left);
                left = Math.min(($(horizontalScrollBar).width() - $(horizontalScrollBarDraggable).outerWidth()), left);

                $( horizontalScrollBarDraggable).css({
                    "left": left + "px"
                });

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
