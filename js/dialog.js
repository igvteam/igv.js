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

    igv.Dialog = function (parentObject) {

        var self = this;

        this.container = $('<div class="igv-grid-container-dialog">');
        parentObject.append( this.container[ 0 ] );

        this.container.draggable();

        this.header = $('<div class="igv-grid-header">');
        this.headerBlurb = $('<div class="igv-grid-header-blurb">');

        this.header.append(this.headerBlurb[ 0 ]);

        igv.dialogCloseWithParentObject(this.header, function () {
            self.hide();
        });

        this.container.append(this.header[ 0 ]);

        self.container.append(rowOfLabel()[ 0 ]);

        self.container.append(rowOfInput()[ 0 ]);

        self.container.append(rowOfCancel()[ 0 ]);

        function rowOfCancel() {

            var rowContainer,
                row,
                column,
                columnFiller;

            row = $('<div class="igv-grid-dialog">');

            // shim
            column = $('<div class="igv-col igv-col-5-8">');
            row.append( column[ 0 ] );

            // cancel button
            column = $('<div class="igv-col igv-col-3-8">');

            columnFiller = $('<div class="igv-col-filler-cancel-button">');
            columnFiller.text("Cancel");

            columnFiller.click(function() {
                self.hide();
            });


            column.append( columnFiller[ 0 ] );
            row.append( column[ 0 ] );

            rowContainer = $('<div class="igv-grid-rect">');
            rowContainer.append( row[ 0 ]);

            return rowContainer;

        }

        function rowOfLabel() {

            var rowContainer,
                row,
                column;

            // input
            row = $('<div class="igv-grid-dialog">');

            column = $('<div class="igv-col igv-col-4-4">');
            self.dialogLabel = $('<div class="igv-user-input-label">');

            column.append( self.dialogLabel[ 0 ] );
            row.append( column[ 0 ] );

            rowContainer = $('<div class="igv-grid-rect">');
            rowContainer.append( row[ 0 ]);

            return rowContainer;

        }

        function rowOfInput() {

            var rowContainer,
                row,
                column;

            // input
            row = $('<div class="igv-grid-dialog">');

            column = $('<div class="igv-col igv-col-4-4">');
            self.dialogInput = $('<input class="igv-user-input-dialog" type="text" value="#000000">');

            column.append( self.dialogInput[ 0 ] );
            row.append( column[ 0 ] );

            rowContainer = $('<div class="igv-grid-rect">');
            rowContainer.append( row[ 0 ]);

            return rowContainer;

        }

    };

    igv.Dialog.prototype.hide = function () {
        $(this.container).offset( { left: 0, top: 0 } );
        this.container.hide();
    };

    igv.Dialog.prototype.show = function () {

        var body_scrolltop = $("body").scrollTop(),
            track_scrolltop = $(this.trackView.trackDiv).scrollTop(),
            track_origin = $(this.trackView.trackDiv).offset(),
            track_size = { width: $(this.trackView.trackDiv).outerWidth(), height: $(this.trackView.trackDiv).outerHeight()},
            size = { width: $(this.container).outerWidth(), height: $(this.container).outerHeight()};

        //console.log("scrollTop. body " + body_scrolltop + " track " + track_scrolltop);

        // centered left-right
        //$(this.container).offset( { left: (track_size.width - size.width)/2, top: track_origin.top } );

        this.container.show();

        $(this.container).offset( { left: (track_size.width - 300), top: (track_origin.top + body_scrolltop) } );

        $(this.container).offset( igv.constrainBBox($(this.container), $(igv.browser.trackContainerDiv)) );

    };

    return igv;

})(igv || {});
