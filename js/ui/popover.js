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

    igv.Popover = function ($parent) {
        this.$parent = this.initializationHelper($parent);
    };

    igv.Popover.prototype.initializationHelper = function ($parent) {

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

        if (igv.colorPicker) {
            igv.makeDraggable(this.$popover, $popoverHeader);
        }

        return $parent;

    };

    igv.Popover.prototype.hide = function () {
        this.$popover.hide();
    };

    igv.Popover.prototype.presentTrackGearMenu = function (pageX, pageY, trackView) {

        var $container,
            items;

        items = igv.trackMenuItemList(this, trackView);
        if (_.size(items) > 0) {

            this.$popoverContent.empty();
            this.$popoverContent.removeClass("igv-popover-track-popup-content");

            $container = $('<div class="igv-track-menu-container">');
            this.$popoverContent.append($container);

            _.each(items, function(item) {

                if (item.init) {
                    item.init();
                }

                $container.append(item.object);

            });

            this.$popover.css(clampPopoverLocation(pageX, pageY, this));
            this.$popover.show();
            this.$popover.offset( igv.constrainBBox(this.$popover, $(igv.browser.trackContainerDiv)) );

        }
    };

    igv.Popover.prototype.presentTrackPopupMenu = function (e, viewport) {

        var track = viewport.trackView.track,
            trackLocationState,
            $container,
            menuItems;

        trackLocationState = createTrackLocationState(e, viewport);

        if (undefined === trackLocationState) {
            return
        }

        menuItems = igv.trackPopupMenuItemList(this, viewport, trackLocationState.genomicLocation, trackLocationState.x, trackLocationState.y);

        if (_.size(menuItems) > 0) {

            this.$popoverContent.empty();
            this.$popoverContent.removeClass("igv-popover-track-popup-content");

            $container = $('<div class="igv-track-menu-container">');
            this.$popoverContent.append($container);

            _.each(menuItems, function(item) {
                $container.append(item.object);
            });

            this.$popover.css(clampPopoverLocation(e.pageX, e.pageY, this));
            this.$popover.show();
        }

    };

    igv.Popover.prototype.presentTrackPopup = function (e, viewport) {

        var track = viewport.trackView.track,
            referenceFrame = viewport.genomicState.referenceFrame,
            trackLocationState,
            dataList,
            popupClickHandlerResult,
            content,
            config;

        trackLocationState = createTrackLocationState(e, viewport);
        if (undefined === trackLocationState) {
            return
        }

        // dataList = track.popupData(trackLocationState.genomicLocation, trackLocationState.x, trackLocationState.y, referenceFrame);

        config =
            {
                popover: this,
                viewport:viewport,
                genomicLocation: trackLocationState.genomicLocation,
                x: trackLocationState.x,
                y: trackLocationState.y
            };
        dataList = track.popupDataWithConfiguration(config);

        popupClickHandlerResult = igv.browser.fireEvent('trackclick', [track, dataList]);

        if (undefined === popupClickHandlerResult) {

            if (_.size(dataList) > 0) {
                content = igv.formatPopoverText(dataList);
            }

        } else if (typeof popupClickHandlerResult === 'string') {
            content = popupClickHandlerResult;
        }

        this.presentContent(e.pageX, e.pageY, content);

    };

    igv.Popover.prototype.presentContent = function (pageX, pageY, content) {
        var $container;

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

    function createTrackLocationState(e, viewport) {

        var referenceFrame = viewport.genomicState.referenceFrame,
            genomicLocation,
            canvasCoords,
            xOrigin;

        canvasCoords = igv.translateMouseCoordinates(e, viewport.canvas);
        genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(canvasCoords.x));

        if (undefined === genomicLocation || null === viewport.tile) {
            return undefined;
        }

        xOrigin = Math.round(referenceFrame.toPixels((viewport.tile.startBP - referenceFrame.start)));

        return { genomicLocation: genomicLocation, x: canvasCoords.x - xOrigin, y: canvasCoords.y }

    }

    function clampPopoverLocation(pageX, pageY, popover) {

        var left,
            containerCoordinates = { x: pageX, y: pageY },
            containerRect = { x: 0, y: 0, width: $(window).width(), height: $(window).height() },
            popupRect,
            popupX = pageX,
            popupY = pageY;

        popupX -= popover.$parent.offset().left;
        popupY -= popover.$parent.offset().top;
        popupRect = { x: popupX, y: popupY, width: popover.$popover.outerWidth(), height: popover.$popover.outerHeight() };

        left = popupX;
        if (containerCoordinates.x + popupRect.width > containerRect.width) {
            left = popupX - popupRect.width;
        }

        return { "left": left + "px", "top": popupY + "px" };
    }

    return igv;

})(igv || {});

