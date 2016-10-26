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

    igv.Popover = function ($parent, id) {

        this.$parent = this.markupWith$Parent($parent, id);

        this.$popoverContent.kinetic({});

    };

    igv.Popover.prototype.markupWith$Parent = function ($parent, id) {

        var self = this,
            $popoverHeader;

        // if (this.$parent) {
        //     return;
        // }

        // this.$parent = $parent;

        // popover container
        this.$popover = $('<div class="igv-popover">');

        if (id) {
            this.$popover.attr("id", id);
        }

        $parent.append(this.$popover);

        // popover header
        $popoverHeader = $('<div class="igv-popoverHeader">');
        this.$popover.append($popoverHeader);

        igv.attachDialogCloseHandlerWithParent($popoverHeader, function () {
            self.hide();
        });

        // popover content
        this.$popoverContent = $('<div>');

        this.$popover.append(this.$popoverContent);

        this.$popover.draggable( { handle: $popoverHeader } );

        return $parent;

    };

    igv.Popover.prototype.hide = function () {
        this.$popover.hide();
    };

    igv.Popover.prototype.presentTrackMenu = function (pageX, pageY, trackView) {

        var $container = $('<div class="igv-track-menu-container">'),
            trackMenuItems = igv.trackMenuItems(this, trackView);

        trackMenuItems.forEach(function (item) {
            $container.append(item.object || item)
        });

        this.$popoverContent.empty();

        this.$popoverContent.removeClass("igv-popoverTrackPopupContent");
        this.$popoverContent.append($container);

        // Attach click handler AFTER inserting markup in DOM.
        // Insertion beforehand will cause it to have NO effect
        // when clicked.
        trackMenuItems.forEach(function (item) {

            if (item.object && item.click) {
                item.object.click( item.click );
            }

            if (item.init) {
                item.init();
            }

        });

        this.$popover.css(popoverPosition(pageX, pageY, this));

        this.$popover.show();

        this.$popover.offset( igv.constrainBBox(this.$popover, $(igv.browser.trackContainerDiv)) );

    };

    igv.Popover.prototype.presentTrackPopup = function (pageX, pageY, content, showOKButton) {

        var self = this,
            ok_button,
            markup;

        if (!content) {
            return;
        }

        markup = content;
        if (true === showOKButton) {
            ok_button = '<button name="button" class="igv-popover-ok-button">OK</button>';
            markup = content + ok_button;
        }

        this.$popoverContent.addClass("igv-popoverTrackPopupContent");

        this.$popoverContent.html(markup);

        this.$popover.css(popoverPosition(pageX, pageY, this)).show();

        if (true === showOKButton) {
            $('.igv-dialog-close-container').hide();
            $('.igv-popover-ok-button').click(function(){
                self.hide();
            });
        } else {
            $('.igv-dialog-close-container').show();
        }

    };

    function popoverPosition(pageX, pageY, popoverWidget) {

        var left,
            containerCoordinates = { x: pageX, y: pageY },
            containerRect = { x: 0, y: 0, width: $(window).width(), height: $(window).height() },
            popupRect,
            popupX = pageX,
            popupY = pageY;

        popupX -= popoverWidget.$parent.offset().left;
        popupY -= popoverWidget.$parent.offset().top;
        popupRect = { x: popupX, y: popupY, width: popoverWidget.$popover.outerWidth(), height: popoverWidget.$popover.outerHeight() };

        left = popupX;
        if (containerCoordinates.x + popupRect.width > containerRect.width) {
            left = popupX - popupRect.width;
        }

        return { "left": left + "px", "top": popupY + "px" };
    }

    return igv;

})(igv || {});

