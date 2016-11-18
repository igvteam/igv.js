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

        this.$parent = this.markupWith$Parent($parent);

        // this.$popoverContent.kinetic({});

    };

    igv.Popover.prototype.markupWith$Parent = function ($parent) {

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

        this.$popover.draggable( { handle: $popoverHeader } );

        return $parent;

    };

    igv.Popover.prototype.hide = function () {
        this.$popover.hide();
    };

    igv.Popover.prototype.presentTrackMenu = function (pageX, pageY, trackView) {

        var $container,
            items;

        this.$popoverContent.empty();
        this.$popoverContent.removeClass("igv-popover-track-popup-content");

        $container = $('<div class="igv-track-menu-container">');
        this.$popoverContent.append($container);

        items = igv.trackMenuItemList(this, trackView);

        _.each(items, function(item) {
            $container.append(item.object || item);

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

    igv.Popover.prototype.presentTrackPopup = function (pageX, pageY, content) {
        var $container;

        if (undefined === content) {
            return;
        }

        this.$popoverContent.empty();
        this.$popoverContent.addClass("igv-popover-track-popup-content");

        $container = $('<div class="igv-track-menu-container">');
        this.$popoverContent.append($container);
        this.$popoverContent.html(content);

        this.$popover.css(popoverPosition(pageX, pageY, this));
        this.$popover.show();

        // $('.igv-dialog-close-container').show();

    };

    igv.Popover.prototype.presentTrackPopupMenu = function (event, viewport) {

        var track = viewport.trackView.track,
            referenceFrame = viewport.genomicState.referenceFrame,
            canvasCoords,
            genomicLocation,
            xTileBP,
            x,
            $container,
            menuItems = [],
            addBorderTop;

        canvasCoords = igv.translateMouseCoordinates(event, viewport.canvas);

        genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(canvasCoords.x));

        xTileBP = referenceFrame.start - viewport.tile.startBP;
        x = Math.round(referenceFrame.toPixels(xTileBP));

        this.$popoverContent.empty();
        this.$popoverContent.addClass("igv-popover-track-popup-content");

        $container = $('<div class="igv-track-menu-container">');
        this.$popoverContent.append($container);

        menuItems.push(igv.trackPopupMenuItem(track, genomicLocation, xTileBP, x));
        if (track.popupMenuItems) {
            menuItems.push(track.popupMenuItems(genomicLocation, xTileBP, x));
        }
        _.each(menuItems, function($item){
            $container.append($item);
        });

        addBorderTop = _.filter(menuItems, function($item, index) {
            return (_.size(menuItems) > 1 && index > 0);
        });

        if (_.size(addBorderTop) > 0) {
            _.each(addBorderTop, function($e){
                $e.addClass('igv-track-menu-border-top');
            });
        }

        this.$popover.css(popoverPosition(event.pageX, event.pageY, this));
        this.$popover.show();

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

