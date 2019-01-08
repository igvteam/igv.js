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

    igv.Popover = function ($parent, browser) {
        this.browser = browser;
        this.$parent = initializationHelper.call(this, $parent);
    };

    function initializationHelper($parent) {

        var self = this,
            $popoverHeader;

        // popover container
        this.$popover = $('<div class="igv-popover">');

        $parent.append(this.$popover);

        // popover header
        $popoverHeader = $('<div class="igv-popover-header">');
        this.$popover.append($popoverHeader);

        igv.attachDialogCloseHandlerWithParent($popoverHeader, function () {
            self.hide();
        });

        // popover content
        this.$popoverContent = $('<div>');

        this.$popover.append(this.$popoverContent);

       // this.$popover.draggable({handle: $popoverHeader.get(0)});
       igv.makeDraggable(this.$popover.get(0), $popoverHeader.get(0));

        return $parent;

    }

    igv.Popover.prototype.hide = function () {
        this.$popover.hide();
    };

    igv.Popover.prototype.presentTrackGearMenu = function (pageX, pageY, menuItemList, browser) {

        var self = this,
            $container;

        // Only 1 popover open at a time
        $('.igv-popover').hide();

        if (menuItemList.length > 0) {

            menuItemList = igv.trackMenuItemListHelper(menuItemList, self.$popover);

            this.$popoverContent.empty();
            this.$popoverContent.removeClass("igv-popover-track-popup-content");

            $container = $('<div class="igv-track-menu-container">');
            this.$popoverContent.append($container);

            menuItemList.forEach(function (item) {

                if (item.init) {
                    item.init();
                }

                $container.append(item.object);
            });

            this.$popover.css({ left: (pageX + 'px'), top: (pageY + 'px') });
            this.$popover.show();

            // this.$popover.css(clampPopoverLocation(pageX, pageY, this));
            // this.$popover.show();
            // this.$popover.offset(igv.constrainBBox(this.$popover, $(browser.trackContainerDiv)));

        }
    };

    igv.Popover.prototype.presentTrackContextMenu = function (e, menuItems) {

        var $container,
            $popover = this.$popover;

        // Only 1 popover open at a time
        $('.igv-popover').hide();

        if (menuItems.length > 0) {

            menuItems = igv.trackMenuItemListHelper(menuItems, $popover);

            this.$popoverContent.empty();
            this.$popoverContent.removeClass("igv-popover-track-popup-content");

            $container = $('<div class="igv-track-menu-container">');
            this.$popoverContent.append($container);

            menuItems.forEach(function (item) {
                $container.append(item.object);
            });

            const page = igv.pageCoordinates(e);
            $popover.css(clampPopoverLocation(page.x, page.y, this));
            $popover.show();
        }

    };

    igv.Popover.prototype.presentTrackPopup = function (e, content) {
        const page = igv.pageCoordinates(e);
        this.presentContent(page.x, page.y, content);

    };

    igv.Popover.prototype.presentContent = function (pageX, pageY, content) {
        var $container;

        // Only 1 popover open at a time
        $('.igv-popover').hide();

        if (undefined === content) {
            return;
        }

        this.$popoverContent.empty();
        this.$popoverContent.addClass("igv-popover-track-popup-content");

        $container = $('<div class="igv-track-menu-container">');
        this.$popoverContent.append($container);
        this.$popoverContent.html(content);

        this.$popover.css(clampPopoverLocation(pageX, pageY, this));
        this.$popover.show();

    };

    igv.Popover.prototype.dispose = function () {
        this.$popover.empty();
        this.$popoverContent.empty();
        Object.keys(this).forEach(function (key) {
            this[key] = undefined;
        })
    }

    function clampPopoverLocation(pageX, pageY, popover) {

        var left,
            containerCoordinates = {x: pageX, y: pageY},
            containerRect = {x: 0, y: 0, width: $(window).width(), height: $(window).height()},
            popupRect,
            popupX = pageX,
            popupY = pageY;

        popupX -= popover.$parent.offset().left;
        popupY -= popover.$parent.offset().top;
        popupRect = {
            x: popupX,
            y: popupY,
            width: popover.$popover.outerWidth(),
            height: popover.$popover.outerHeight()
        };

        left = popupX;
        if (containerCoordinates.x + popupRect.width > containerRect.width) {
            left = popupX - popupRect.width;
        }

        return {"left": left + "px", "top": popupY + "px"};
    }

    return igv;

})(igv || {});

