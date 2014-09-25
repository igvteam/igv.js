/**
 * Created by turner on 9/19/14.
 */
var igv = (function (igv) {

    var popoverDiv,
        popoverCloseDiv,
        popoverContentDiv;

    igv.Popover = function (parent, trackView) {

        this.trackView = trackView;

        if (!popoverDiv) {
            markupWithParentDiv(parent);
        }

      function markupWithParentDiv (parentDiv) {

            // popover
            popoverDiv = document.createElement('div');
            parentDiv.appendChild(popoverDiv);

            popoverDiv.id = "popover_" + igv.guid();
            popoverDiv.className = "igv-popover";

            // popover content
            popoverContentDiv = document.createElement("div");
            popoverDiv.appendChild(popoverContentDiv);

            popoverContentDiv.className = "igv-popoverContent";
            popoverContentDiv.innerHTML = "blah blah";

            // popover close
            popoverCloseDiv = document.createElement("div");
            popoverDiv.appendChild(popoverCloseDiv);

            popoverCloseDiv.className = "igv-popoverClose";
            popoverCloseDiv.innerHTML = "x";

            popoverCloseDiv.onclick = function (e) {

                $(popoverDiv).hide();

            };


        };

    };

    igv.Popover.prototype.hide = function () {

        $(popoverDiv).hide();
    };

    igv.Popover.prototype.show = function (popupx, popupy, content) {

        if (content) {

            popoverContentDiv.innerHTML = content;

            $(popoverDiv).css({
                "left": popupx + "px",
                "top": popupy + "px"
            }).show();

        }

    };

    return igv;

})(igv || {});




// OPEN-TIP IMPLEMENTATION
//
//igv.Popover = function (parent, trackView) {
//
//    this.trackView = trackView;
//
//    if (!popover) {
//        popover = new Opentip(parent);
//        popover.hide();
//        parent.mouseout = function (e) {
//            popover.setContent("");
//            popover.hide();
//        }
//    }
//
//    function markupWithParentDiv(parentDiv) {
//
//        // popover
//        popoverDiv = document.createElement('div');
//        parentDiv.appendChild(popoverDiv);
//        popoverDiv = popoverDiv;
//
//        popoverDiv.id = "popover_" + igv.guid();
//        popoverDiv.className = "igv-popover";
//
//        // popover content
//        popoverContentDiv = document.createElement("div");
//        popoverDiv.appendChild(popoverContentDiv);
//        popoverContentDiv = popoverContentDiv;
//
//        popoverContentDiv.className = "igv-popoverContent";
//        popoverContentDiv.innerHTML = "blah blah";
//
//        // popover close
//        popoverCloseDiv = document.createElement("div");
//        popoverDiv.appendChild(popoverCloseDiv);
//        popoverCloseDiv = popoverCloseDiv;
//
//        popoverCloseDiv.className = "igv-popoverClose";
//        popoverCloseDiv.innerHTML = "x";
//
//        popoverCloseDiv.onclick = function (e) {
//
//            $(popoverDiv).hide();
//
//        };
//
//
//    };
//
//};
//
//igv.Popover.prototype.hide = function () {
//
//    popover.hide();
//    popover.setContent(null);
//};
//
//igv.Popover.prototype.show = function (popupx, popupy, content) {
//
//    if (content) {
//
//        popover.setContent(content);
//        popover.show();
//
//    }
//
//};
