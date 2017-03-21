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

    igv.DataRangeDialog = function ($parent) {

        var self = this;

        this.container = $('<div class="igv-grid-container-dialog">');
        $parent.append(this.container);

        this.container.draggable();

        this.header = $('<div class="igv-grid-header">');
        this.headerBlurb = $('<div class="igv-grid-header-blurb">');

        this.header.append(this.headerBlurb[ 0 ]);

        igv.attachDialogCloseHandlerWithParent(this.header, function () {
            self.hide();
        });

        this.container.append(this.header[ 0 ]);

        self.container.append(doLayout()[ 0 ]);

        self.container.append(doOKCancel()[ 0 ]);

        function doOKCancel() {

            var rowContainer,
                row,
                column,
                columnFiller;


            row = $('<div class="igv-grid-dialog">');


            // shim
            column = $('<div class="igv-col igv-col-1-8">');
            //
            row.append( column[ 0 ] );


            // ok button
            column = $('<div class="igv-col igv-col-3-8">');
            self.ok = $('<div class="igv-col-filler-ok-button">');
            self.ok.text("OK");
            column.append( self.ok[ 0 ] );
            //
            row.append( column[ 0 ] );


            // cancel button
            column = $('<div class="igv-col igv-col-3-8">');
            columnFiller = $('<div class="igv-col-filler-cancel-button">');
            columnFiller.text("Cancel");
            columnFiller.click(function() { self.hide(); });
            column.append( columnFiller[ 0 ] );
            //
            row.append( column[ 0 ] );


            // shim
            column = $('<div class="igv-col igv-col-1-8">');
            //
            row.append( column[ 0 ] );


            rowContainer = $('<div class="igv-grid-rect">');
            rowContainer.append( row[ 0 ]);

            return rowContainer;
        }

        function doLayout() {

            var rowContainer = $('<div class="igv-grid-rect">'),
                row,
                column,
                columnFiller;


            // minimum
            row = $('<div class="igv-grid-dialog">');

            // vertical spacer
            column = $('<div class="spacer10">');
            row.append( column[ 0 ] );


            column = $('<div class="igv-col igv-col-3-8">');
            self.minLabel = $('<div class="igv-data-range-input-label">');
            self.minLabel.text("Minimum");
            column.append( self.minLabel[ 0 ] );
            row.append( column[ 0 ] );

            column = $('<div class="igv-col igv-col-3-8">');
            self.minInput = $('<input class="igv-data-range-input" type="text" value="125">');
            column.append( self.minInput[ 0 ] );
            row.append( column[ 0 ] );

            rowContainer.append( row[ 0 ]);



            // maximum
            row = $('<div class="igv-grid-dialog">');

            column = $('<div class="igv-col igv-col-3-8">');
            self.maxLabel = $('<div class="igv-data-range-input-label">');
            self.maxLabel.text("Maximum");
            column.append( self.maxLabel[ 0 ] );
            row.append( column[ 0 ] );

            column = $('<div class="igv-col igv-col-3-8">');
            self.maxInput = $('<input class="igv-data-range-input" type="text" value="250">');
            column.append( self.maxInput[ 0 ] );
            row.append( column[ 0 ] );
            rowContainer.append( row[ 0 ]);



            // logaritmic
            //row = $('<div class="igv-grid-dialog">');
            //
            //column = $('<div class="igv-col igv-col-3-8">');
            //columnFiller = $('<div class="igv-data-range-input-label">');
            //columnFiller.text("Log scale");
            //column.append( columnFiller[ 0 ] );
            //row.append( column[ 0 ] );
            //
            //column = $('<div class="igv-col igv-col-3-8">');
            //self.logInput = $('<input class="igv-data-range-input" type="checkbox">');
            //
            //// Disable until implemented in track
            //self.logInput[0].disabled = true;
            //
            //column.append( self.logInput[ 0 ] );
            //row.append( column[ 0 ] );
            //rowContainer.append( row[ 0 ]);

            return rowContainer;

        }

    };

    igv.DataRangeDialog.prototype.configureWithTrackView = function (trackView) {

        var self = this,
            min,
            max;

        this.trackView = trackView;

        if(trackView.track.dataRange) {
            min = trackView.track.dataRange.min;
            max = trackView.track.dataRange.max;
        } else {
            min = 0;
            max = 100;
        }

        this.minInput.val(min);
        this.maxInput.val(max);

        //this.logInput.prop('checked', false);

        this.ok.unbind();
        this.ok.click(function() {

            min = parseFloat(self.minInput.val());
            max = parseFloat(self.maxInput.val());

            if(isNaN(min) || isNaN(max)) {

                //alert("Must input numeric values");
                igv.presentAlert("Must input numeric values");
            } else {

                trackView.track.dataRange.min = min;
                trackView.track.dataRange.max = max;
                trackView.track.autoScale = false;

                self.hide();
                trackView.update();
            }

        });

    };

    igv.DataRangeDialog.prototype.hide = function () {
        this.container.offset( { left: 0, top: 0 } );
        this.container.hide();
    };

    igv.DataRangeDialog.prototype.show = function () {

        var body_scrolltop = $("body").scrollTop(),
            track_scrolltop = $(this.trackView.trackDiv).scrollTop(),
            track_origin = $(this.trackView.trackDiv).offset(),
            track_size = { width: $(this.trackView.trackDiv).outerWidth(), height: $(this.trackView.trackDiv).outerHeight()},
            size = { width: this.container.outerWidth(), height: this.container.outerHeight()};

        //console.log("scrollTop. body " + body_scrolltop + " track " + track_scrolltop);

        // centered left-right
        //this.container.offset( { left: (track_size.width - size.width)/2, top: track_origin.top } );

        this.container.show();

        this.container.offset( { left: (track_size.width - 300), top: (track_origin.top + body_scrolltop) } );

        this.container.offset( igv.constrainBBox(this.container, $(igv.browser.trackContainerDiv)) );

    };

    return igv;

})(igv || {});
