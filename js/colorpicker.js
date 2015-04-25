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
 * Created by turner on 4/15/15.
 */
var igv = (function (igv) {

    igv.ColorPicker = function (parentObject, userPalette) {

        var self = this,
            palette;

        this.colorPickerContainer = $('<div class="grid-container ui-widget-content">');
        parentObject.append( this.colorPickerContainer[ 0 ] );

        this.colorPickerContainer.draggable();

        this.colorPickerHeader = $('<div class="grid-header">');
        this.colorPickerHeaderBlurb = $('<div class="grid-header-blurb">');

        this.colorPickerHeader.append(this.colorPickerHeaderBlurb[ 0 ]);

        igv.dialogCloseWithParentObject(this.colorPickerHeader, function () {
            self.hide();
        });

        this.colorPickerContainer.append(this.colorPickerHeader[ 0 ]);

        // Color Picker Object -- singleton shared by all components
        palette = [
            [ "#666666", "#0000cc", "#009900", "#cc0000" ],
            [ "#ffcc00", "#9900cc", "#00ccff", "#ff6600" ]
        ];

        if (userPalette) {

            if ("replace" === userPalette.usage) {

                palette = userPalette.colors;

            } else if ("append" === userPalette.usage) {

                userPalette.colors.forEach(function(row){

                    palette.push(row);
                });

            }

        }

        count(1 + palette.length).forEach(function(rowDigit, r, rowDigits){

            var row,
                rowContainer,
                column,
                filler;

            rowContainer = $('<div class="grid-rect">');
            row = $('<div class="grid">');

            if (r < palette.length) {

                count(4).forEach(function(colDigit, c, colDigits){

                    column = $('<div class="col col-1-4 col-fa">');
                    filler = $('<div class="col-filler">');
                    column.click(function(){

                        igv.setTrackColor(self.trackView.track, igv.hex2Color( palette[ r ][ c ] ));
                        self.trackView.update();

                    });

                    filler.css( { "background-color" : palette[ r ][ c ] } );
                    column.append( filler[ 0 ] );
                    row.append( column[ 0 ] );

                });

            } else {

                rowContainer.append( $('<hr class="grid-dividing-line">')[ 0 ]);

                column = $('<div class="col col-1-4 col-fa">');
                filler = $('<div class="col-filler">');
                column.click(function(){

                    igv.setTrackColor(self.trackView.track, igv.hex2Color( "#eee" ));
                    self.trackView.update();
                });

                filler.css( { "background-color" : "#eee" } );
                column.append( filler[ 0 ] );
                row.append( column[ 0 ] );

            }

            rowContainer.append( row[ 0 ]);

            self.colorPickerContainer.append(rowContainer[ 0 ]);

        });

        function count(c) {

            var list = [];
            for (var i = 0; i < c; i++) {
                list.push(i);
            }

            return list;
        }
    };

    igv.ColorPicker.prototype.hide = function () {
        $(this.colorPickerContainer).offset( { left: 0, top: 0 } );
        this.colorPickerContainer.hide();
    };

    igv.ColorPicker.prototype.show = function () {

        var track_origin = $(this.trackView.trackDiv).offset(),
            track_size = { width: $(this.trackView.trackDiv).outerWidth(), height: $(this.trackView.trackDiv).outerHeight()},
            size = { width: $(this.colorPickerContainer).outerWidth(), height: $(this.colorPickerContainer).outerHeight()};

        $(this.colorPickerContainer).offset( { left: (track_size.width - size.width)/2, top: track_origin.top } );

        this.colorPickerHeaderBlurb.text( this.trackView.track.label);

        this.colorPickerContainer.show();
    };

    return igv;

})(igv || {});
