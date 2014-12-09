/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Created by turner on 9/19/14.
 */
var igv = (function (igv) {

    igv.Popover = function (parentDiv) {

        this.markupWithParentDiv(parentDiv)
    };

    igv.Popover.prototype.markupWithParentDiv = function(parentDiv) {

        var myself = this,
            popoverHeader,
            popoverClose,
            popoverCloseFontAwesome;

        if (this.parentDiv) {
            return;
        }

        this.parentDiv = parentDiv;

        // popover container
        this.popover = $('<div class="igv-popover">');
        $(this.parentDiv).append(this.popover[ 0 ]);

        // popover header
        popoverHeader = $('<div class="igv-popoverHeader">');
        this.popover.append(popoverHeader[ 0 ]);

        // popover close container
        popoverClose = $('<div class="igv-popoverClose">');
        popoverHeader.append(popoverClose[ 0 ]);

        // popover close button
        popoverCloseFontAwesome = $('<i class="fa fa-times igv-popoverCloseFontAwesome">');
        popoverClose.append(popoverCloseFontAwesome[ 0 ]);

        popoverCloseFontAwesome.hover(

            function() {
                popoverCloseFontAwesome.removeClass("fa-times"       );
                popoverCloseFontAwesome.addClass   ("fa-times-circle fa-lg");

                popoverCloseFontAwesome.css({
                    "color" : "#222"
                });
            },

            function() {
                popoverCloseFontAwesome.removeClass("fa-times-circle fa-lg");
                popoverCloseFontAwesome.addClass   ("fa-times"       );

                popoverCloseFontAwesome.css({
                    "color" : "#444"
                });

            }
        );

        popoverCloseFontAwesome.click(function () {
            myself.hide();
        });

        // popover content
        this.popoverContent = $('<div class="igv-popoverContent">');
        this.popover.append(this.popoverContent[ 0 ]);

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
        this.popover.hide();
    };

    igv.Popover.prototype.presentTrackMenu = function (pageX, pageY, trackView) {

        var myself = this,
            deleteButton,
            wrapper = $('<div class="igv-track-menu-item">'),
            container = $('<div class="igv-track-menu-container">');

        deleteButton = { };
        deleteButton[ "object" ] = $('<a href="#">DELETE</a>');
        deleteButton[  "click" ] = function () {
            myself.hide();
            trackView.browser.removeTrack(trackView.track);
        };

        wrapper.append(deleteButton[ "object" ][ 0 ]);
        container.append(wrapper[ 0 ]);

        ["Track Name", "Track Height", "Feature Color"].forEach(function (item, i, items) {

            var menuItem = $('<div class="igv-track-menu-item">');
            menuItem.html(item);
            container.append(menuItem[ 0 ]);
        });

        this.popoverContent.empty();

        this.popoverContent.append(container[ 0 ]);

        // Attach click handler AFTER inserting markup in DOM.
        // Insertion beforehand will cause it to have NO effect
        // when clicked.
        deleteButton[ "object" ].click(deleteButton[ "click" ]);

        this.popover.css( popoverPosition(pageX, pageY, this) ).show();

    };

    igv.Popover.prototype.presentTrackPopup = function (pageX, pageY, content) {

        var height;

        if (content) {

            this.popoverContent.html(content);

            this.popover.css( popoverPosition(pageX, pageY, this) ).show();

        }
    };

    function popoverPosition(pageX, pageY, popoverWidget) {

        var left,
            containerCoordinates = { x : pageX, y : pageY },
            containerRect = { x : 0, y : 0, width : $(window).width(), height : $(window).height() },
            popupRect,
            popupX = pageX,
            popupY = pageY;

        popupX -= $(popoverWidget.parentDiv).offset().left;
        popupY -= $(popoverWidget.parentDiv).offset().top;
        popupRect = { x : popupX, y : popupY, width : popoverWidget.popover.outerWidth(), height : popoverWidget.popover.outerHeight() };

        left = popupX;
        if (containerCoordinates.x + popupRect.width > containerRect.width) {
            left = popupX - popupRect.width;
        }

        return { "left" : left + "px", "top" : popupY + "px" };
    }

    return igv;

})(igv || {});

