/**
 * Created by turner on 9/19/14.
 */
var igv = (function (igv) {

    var popoverDiv,
        popoverCloseDiv,
        popoverContentDiv;

    igv.Popover = function (parent) {


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


        }

    };

    igv.Popover.prototype.hide = function () {

        $(popoverDiv).hide();
    };

    igv.Popover.prototype.show = function (pageX, pageY, content) {

        var igvRootDivObject = $("#igvRootDiv"),
            left,
            top,
            containerCoordinates = { x : pageX - $(window).scrollLeft(), y : pageY - $(window).scrollTop() },
            containerRect = { x : 0, y : 0, width : $(window).width(), height : $(window).height() },
            popupRect = {},
            popoverDivObject,
            popupx = pageX,
            popupy = pageY;

        if (content) {

            popoverContentDiv.innerHTML = content;

            popoverDivObject = $(popoverDiv);
            popupx -= igvRootDivObject.offset().left;
            popupy -= igvRootDivObject.offset().top;
            popupRect = { x : popupx, y : popupy, width : popoverDivObject.outerWidth(), height : popoverDivObject.outerHeight() };

            left = popupx;
            if (containerCoordinates.x + popupRect.width > containerRect.width) {
                left = popupx - popupRect.width;
            }

            top = popupy;
            if (containerCoordinates.y + popupRect.height > containerRect.height) {
                top = popupy - popupRect.height;
            }

            popoverDivObject.css({
                "left": left + "px",
                "top" : top  + "px"
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
