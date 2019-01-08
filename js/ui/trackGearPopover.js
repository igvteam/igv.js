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
 * Created by turner on 1/8/19.
 */
var igv = (function (igv) {

    igv.TrackGearPopover = function ($parent, browser) {

        this.browser = browser;

        // popover container
        this.$popover = $('<div>', { class: 'igv-trackgear-popover' });
        $parent.append(this.$popover);

        // popover header
        let $popoverHeader = $('<div>', { class: 'igv-trackgear-popover-header' });
        this.$popover.append($popoverHeader);

        let self = this;
        igv.attachDialogCloseHandlerWithParent($popoverHeader, function () {
            self.$popover().hide();
        });

        this.$popoverContent = $('<div>');
        this.$popover.append(this.$popoverContent);

        igv.makeDraggable(this.$popover.get(0), $popoverHeader.get(0));
    };

    igv.TrackGearPopover.prototype.presentMenuList = function (pageX, pageY, menuItemList) {

        var self = this,
            $container;

        if (menuItemList.length > 0) {

            menuItemList = igv.trackMenuItemListHelper(menuItemList, self.$popover);

            this.$popoverContent.empty();

            $container = $('<div>', { class: 'igv-track-menu-container' });
            this.$popoverContent.append($container);

            menuItemList.forEach(function (item) {

                if (item.init) {
                    item.init();
                }

                $container.append(item.object);
            });

            this.$popover.css({ left: (pageX + 'px'), top: (pageY + 'px') });
            this.$popover.show();

        }
    };

    igv.TrackGearPopover.prototype.dispose = function () {
        this.$popover.empty();
        this.$popoverContent.empty();
        Object.keys(this).forEach(function (key) {
            this[key] = undefined;
        })
    };

    return igv;

})(igv || {});

