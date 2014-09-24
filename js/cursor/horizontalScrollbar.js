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

        var horizontalScrollBarContainer = $('<div class="igv-horizontal-scrollbar-container-div">')[0],
            horizontalScrollBar          = $('<div class="igv-horizontal-scrollbar-div">')[0],
            horizontalScrollBarDraggable = $('<div class="igv-horizontal-scrollbar-draggable-div">')[0];

        parentDivObject.append(horizontalScrollBarContainer);
        $(horizontalScrollBarContainer).append(horizontalScrollBar);
        $(horizontalScrollBar).append(horizontalScrollBarDraggable);

    };

    return cursor;

})(cursor || {});
