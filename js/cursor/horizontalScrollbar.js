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

    cursor.HorizontalScrollbar.prototype.markupWithParentDivObject = function (parentDivObject) {

        var myself = this,
            horizontalScrollBarContainer = $('<div class="igv-horizontal-scrollbar-container-div">')[0],
            horizontalScrollBar          = $('<div class="igv-horizontal-scrollbar-div">')[0],
            horizontalScrollBarDraggable = $('<div class="igv-horizontal-scrollbar-draggable-div">')[0];

        myself.isMouseDown = undefined;
        myself.lastMouseX = undefined;

        parentDivObject.append(horizontalScrollBarContainer);
        $(horizontalScrollBarContainer).append(horizontalScrollBar);
        $(horizontalScrollBar).append(horizontalScrollBarDraggable);

        $( horizontalScrollBarDraggable ).mousedown(function(e) {

            myself.isMouseDown = true;
            myself.lastMouseX = e.offsetX;

        });

        $( horizontalScrollBarDraggable ).mousemove(function (e) {

            var dx,
                left;

            dx = e.offsetX - myself.lastMouseX;
            left = $( horizontalScrollBarDraggable).position().left;

            if (myself.isMouseDown && myself.lastMouseX) {

                left += dx;
                $( horizontalScrollBarDraggable).css({
                    "left": left + "px"
                });

            }

        });

        $( horizontalScrollBarDraggable ).mouseup(function(e) {
            myself.isMouseDown = false;
            myself.lastMouseX = undefined;
        });


        $( horizontalScrollBarDraggable ).mouseout(function(e) {
            myself.isMouseDown = false;
            myself.lastMouseX = undefined;
        });

    };

    return cursor;

})(cursor || {});
