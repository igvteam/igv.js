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

    igv.Dialog = function ($parent) {

        var self = this,
            $header,
            $headerBlurb;

        this.$container = $('<div class="igv-grid-container-dialog">');

        $parent.append( this.$container[ 0 ] );

        $header = $('<div class="igv-grid-header">');
        $headerBlurb = $('<div class="igv-grid-header-blurb">');
        $header.append($headerBlurb[ 0 ]);

        this.$container.append($header[ 0 ]);

        initializationHelper.call(this);

        this.$container.draggable({ handle:$header.get(0) });

        igv.attachDialogCloseHandlerWithParent($header, function () {
            self.hide();
        });

    };

    function initializationHelper() {

        this.$container.append(this.rowOfLabel()[ 0 ]);

        this.$container.append(this.rowOfInput()[ 0 ]);

        this.$container.append(this.rowOfOkCancel()[ 0 ]);


    };

    igv.Dialog.prototype.rowOfOk = function() {

        var $rowContainer,
            $row,
            $column,
            $columnFiller;

        $row = $('<div class="igv-grid-dialog">');

        // shim
        $column = $('<div class="igv-col igv-col-1-4">');
        //
        $row.append( $column[ 0 ] );


        // ok button
        $column = $('<div class="igv-col igv-col-2-4">');
        $columnFiller = $('<div class="igv-col-button igv-col-filler-ok-button">');
        $columnFiller.text("OK");

        this.$ok = $columnFiller;

        $column.append( $columnFiller[ 0 ] );
        //
        $row.append( $column[ 0 ] );

        //
        $rowContainer = $('<div class="igv-grid-rect">');
        $rowContainer.append( $row[ 0 ]);

        return $rowContainer;

    };

    igv.Dialog.prototype.rowOfOkCancel = function() {

        var self = this,
            $rowContainer,
            $row,
            $column,
            $columnFiller;

        $row = $('<div class="igv-grid-dialog">');

        // shim
        $column = $('<div class="igv-col igv-col-1-8">');
        //
        $row.append( $column[ 0 ] );


        // ok button
        $column = $('<div class="igv-col igv-col-3-8">');
        $columnFiller = $('<div class="igv-col-button igv-col-filler-ok-button">');
        $columnFiller.text("OK");

        this.$ok = $columnFiller;

        $column.append( $columnFiller[ 0 ] );
        //
        $row.append( $column[ 0 ] );


        // cancel button
        $column = $('<div class="igv-col igv-col-3-8">');
        $columnFiller = $('<div class="igv-col-button igv-col-filler-cancel-button">');
        $columnFiller.text("Cancel");
        $columnFiller.click(function() {
            self.$dialogInput.val(undefined);
            self.hide();
        });
        $column.append( $columnFiller[ 0 ] );
        //
        $row.append( $column[ 0 ] );

        // shim
        $column = $('<div class="igv-col igv-col-1-8">');
        //
        $row.append( $column[ 0 ] );

        $rowContainer = $('<div class="igv-grid-rect">');
        $rowContainer.append( $row[ 0 ]);

        return $rowContainer;

    };

    igv.Dialog.prototype.rowOfLabel = function() {

        var rowContainer,
            row,
            column;

        // input
        row = $('<div class="igv-grid-dialog">');

        column = $('<div class="igv-col igv-col-4-4">');
        this.$dialogLabel = $('<div class="igv-user-input-label">');

        column.append( this.$dialogLabel[ 0 ] );
        row.append( column[ 0 ] );

        rowContainer = $('<div class="igv-grid-rect">');
        rowContainer.append( row[ 0 ]);

        return rowContainer;

    };

    igv.Dialog.prototype.rowOfInput = function() {

        var rowContainer,
            row,
            column;

        // input
        row = $('<div class="igv-grid-dialog">');

        column = $('<div class="igv-col igv-col-4-4">');
        this.$dialogInput = $('<input class="igv-user-input-dialog" type="text" value="#000000">');

        column.append( this.$dialogInput[ 0 ] );
        row.append( column[ 0 ] );

        rowContainer = $('<div class="igv-grid-rect">');
        rowContainer.append( row[ 0 ]);

        return rowContainer;

    };

    igv.Dialog.prototype.configure = function (labelHTMLFunction, inputValue, clickFunction) {

        var self = this,
            clickOK;

        if (labelHTMLFunction) {
            self.$dialogLabel.html(labelHTMLFunction());
            self.$dialogLabel.show();
        } else {
            self.$dialogLabel.hide();
        }

        if (inputValue !== undefined) {

            self.$dialogInput.val(inputValue);

            self.$dialogInput.unbind();
            self.$dialogInput.change(function(){

                if (clickFunction) {
                    clickFunction();
                }

                self.hide();
            });

            self.$dialogInput.show();
        } else {
            self.$dialogInput.hide();
        }

        self.$ok.unbind();
        self.$ok.click(function() {

            if (clickFunction) {
                clickFunction();
            }

            self.hide();
        });

    };

    igv.Dialog.prototype.hide = function () {

        if (this.$container.hasClass('igv-grid-container-dialog')) {
            this.$container.offset( { left: 0, top: 0 } );
        }
        this.$container.hide();
    };

    igv.Dialog.prototype.show = function ($host) {

        var body_scrolltop,
            track_origin,
            track_size,
            offset,
            _top,
            _left;

        body_scrolltop = $('body').scrollTop();

        if (this.$container.hasClass('igv-grid-container-dialog')) {

            offset = $host.offset();

            _top = offset.top + body_scrolltop;
            _left = $host.outerWidth() - 300;

            this.$container.offset( { left: _left, top: _top } );

            //track_origin = $host.offset();
            //track_size =
            //{
            //    width: $host.outerWidth(),
            //    height: $host.outerHeight()
            //};
            //this.$container.offset( { left: (track_size.width - 300), top: (track_origin.top + body_scrolltop) } );
            //this.$container.offset( igv.constrainBBox(this.$container, $(igv.browser.trackContainerDiv)) );
        }

        this.$container.show();

    };

    return igv;

})(igv || {});
