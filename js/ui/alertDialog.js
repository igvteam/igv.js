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
 * Created by turner on 4/29/15.
 */
var igv = (function (igv) {

    igv.AlertDialog = function ($parent, id) {

        var self = this,
            $header,
            $headerBlurb;

        this.$parent = $parent;
        this.$container = $('<div>', { "id": id, "class": "igv-grid-container-alert-dialog" });
        $parent.append(this.$container);

        $header = $('<div class="igv-grid-header">');
        $headerBlurb = $('<div class="igv-grid-header-blurb">');
        $header.append($headerBlurb);
        igv.attachDialogCloseHandlerWithParent($header, function () {
            self.hide();
        });
        this.$container.append($header);

        this.$container.append(this.alertTextContainer());

        this.$container.append(this.rowOfOk());

    };

    igv.AlertDialog.prototype.alertTextContainer = function() {

        var $rowContainer,
            $col;

        $rowContainer = $('<div class="igv-grid-rect">');

        this.$dialogLabel = $('<div>', { "class": "igv-col igv-col-4-4 igv-alert-dialog-text" });

        // $col = $('<div class="igv-col igv-col-4-4">');
        // $col.append(this.$dialogLabel);
        // $rowContainer.append($col);

        $rowContainer.append(this.$dialogLabel);

        return $rowContainer;

    };

    igv.AlertDialog.prototype.rowOfOk = function() {

        var self = this,
            $rowContainer,
            $col;

        $rowContainer = $('<div class="igv-grid-rect">');

        // shim
        $col = $('<div class="igv-col igv-col-1-4">');
        $rowContainer.append( $col );

        // ok button
        $col = $('<div class="igv-col igv-col-2-4">');
        this.$ok = $('<div class="igv-col-filler-ok-button">');
        this.$ok.text("OK");

        this.$ok.unbind();
        this.$ok.click(function() {
            self.hide();
        });

        $col.append( this.$ok );
        $rowContainer.append( $col );

        return $rowContainer;

    };

    igv.AlertDialog.prototype.hide = function () {

        if (this.$container.hasClass('igv-grid-container-dialog')) {
            this.$container.offset( { left: 0, top: 0 } );
        }
        this.$container.hide();
    };

    igv.AlertDialog.prototype.show = function () {

        var obj;

        obj =
            {
                left: (this.$parent.width() - this.$container.width())/2,
                top: (this.$parent.height() - this.$container.height())/2

            };
        this.$container.css(obj);

        this.$container.show();
    };

    return igv;

})(igv || {});
