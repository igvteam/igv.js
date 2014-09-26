/**
 * Created by turner on 9/19/14.
 */
var igv = (function (igv) {

    var popoverDiv,
        popoverCloseElement,
        popoverCloseIcon,
        popoverPointerDiv,
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






            // popover pointer
//            <i class="fa fa-location-arrow"></i>
//            <i class="fa fa-play"></i>
//            popoverPointerDiv = document.createElement("i");
//            popoverDiv.appendChild(popoverPointerDiv);
//            popoverPointerDiv.className = "igv-popoverPointer fa fa-chevron-right fa-2x fa-rotate-90";






//            // popover close
//            popoverCloseElement = document.createElement("div");
//            popoverDiv.appendChild(popoverCloseElement);
//            popoverCloseElement.className = "igv-popoverClose";
//            popoverCloseElement.innerHTML = "x";

            // popover close
            popoverCloseElement = document.createElement("span");
            popoverDiv.appendChild(popoverCloseElement);
            popoverCloseElement.className = "igv-popoverCloseElement";

            popoverCloseIcon = document.createElement("i");
            popoverCloseElement.appendChild(popoverCloseIcon);
            popoverCloseIcon.className = "igv-popoverCloseFontAwesome fa fa-times";
//            popoverCloseIcon.className = "igv-popoverCloseFontAwesome fa fa-times-circle fa-lg";

            $(popoverCloseElement).hover(

                function() {
                    $(popoverCloseIcon).removeClass("fa-times"       );
                    $(popoverCloseIcon).addClass   ("fa-times-circle fa-lg");

                    $(popoverCloseIcon).css({
                        "color" : "#f00"
                    });
                },

                function() {
                    $(popoverCloseIcon).removeClass("fa-times-circle fa-lg");
                    $(popoverCloseIcon).addClass   ("fa-times"       );

                    $(popoverCloseIcon).css({
                        "color" : "#444"
                    });

                }
            );

            popoverCloseElement.onclick = function (e) {

                $(popoverDiv).hide();

            };


        }

    };

    igv.Popover.prototype.testData = function (rows) {
        var i,
            name,
            nameValues = [];

        for (i = 0; i < rows; i++) {
            name = "name " + i;
            nameValues.push( { name : name, value : "verbsgohuman" } );
        }

        return nameValues;
    };

    igv.Popover.prototype.hide = function () {

        $(popoverDiv).hide();
    };

    igv.Popover.prototype.show = function (pageX, pageY, content) {

        var igvRootDivObject = $("#igvRootDiv"),
            left,
            top,
            height,
            containerCoordinates = { x : pageX - $(window).scrollLeft(), y : pageY - $(window).scrollTop() },
            containerRect = { x : 0, y : 0, width : $(window).width(), height : $(window).height() },
            popupRect = {},
            popoverDivObject,
            popoverContentDivObject,
            popupx = pageX,
            popupy = pageY;

        if (content) {

            popoverContentDivObject = $(popoverContentDiv);
            popoverContentDivObject.html(content);

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

            height = popoverContentDivObject.height() + 20;
            popoverDivObject.css({
                "height": height + "px"
            });


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
