/**
 * Created by turner on 9/23/14.
 */
/**
 * Created by turner on 9/19/14.
 */
var cursor = (function (cursor) {

    cursor.HorizontalScrollbar = function (parentDivObject) {

        this.markupWithParentDivObject(parentDivObject);

    };

    cursor.HorizontalScrollbar.prototype.update = function (cursorModel, referenceFrame) {

        var horizontalScrollBar = $(".igv-horizontal-scrollbar-div").first(),
            horizontalScrollBarDraggable = $(".igv-horizontal-scrollbar-draggable-div").first(),
//            regionListLength = cursorModel.getRegionList().length,
            regionListLength = cursorModel.regions.length,
            regionsOnScreen,
            left,
            width;

        regionsOnScreen = horizontalScrollBar.width() / cursorModel.framePixelWidth;

        left = referenceFrame.toPixels( referenceFrame.start );
        width = (regionsOnScreen/regionListLength) * horizontalScrollBar.width();

        $( horizontalScrollBarDraggable).css({
            "left": left + "px",
            "width": width + "px"
        });

        console.log("HorizontalScrollbar.update start " + igv.numberFormatter( Math.round(referenceFrame.start) ));
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

        parentDivObject.append(horizontalScrollBarContainer);
        $(horizontalScrollBarContainer).append(horizontalScrollBar);
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
