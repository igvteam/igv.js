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
            palette,
            row,
            rowContainer,
            column,
            filler;

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

        count(palette.length).forEach(function(r){

            self.colorPickerContainer.append(makeRow(r)[ 0 ]);

        });

        self.colorPickerContainer.append($('<hr class="grid-dividing-line">')[ 0 ]);

        // user enter color
        self.userEnterColorRowContainer = $('<div class="grid-rect">');

        column = $('<div class="col col-4-4">');

        self.systemColorPicker = $('<input class="user-color-input" type="text" value="#ff0000">');
        self.systemColorPicker.change(function () {

            var hex = $(this).val();
            igv.setTrackColor(self.trackView.track, igv.hex2Color( hex ));
            self.trackView.update();
        });

        column.append( self.systemColorPicker[ 0 ] );

        row = $('<div class="grid">');
        row.append( column[ 0 ] );

        self.userEnterColorRowContainer.append( row[ 0 ]);

        self.colorPickerContainer.append(self.userEnterColorRowContainer[ 0 ]);


        self.colorPickerContainer.append($('<hr class="grid-dividing-line">')[ 0 ]);


        // current color
        self.currentColorRowContainer = $('<div class="grid-rect">');

        self.trackColorTile = $('<div class="col-filler">');
        self.trackColorTile.css( { "background-color" : "#eee" } );

        column = $('<div class="col col-1-4">');
        column.append( self.trackColorTile[ 0 ] );

        column.click(function(){
            igv.setTrackColor(self.trackView.track, $(this).find(".col-filler").css( "background-color" ));
            self.trackView.update();
        });


        row = $('<div class="grid">');
        row.append( column[ 0 ] );

        column = $('<div class="col col-3-4 col-label">');
        column.text("Current color");
        row.append( column[ 0 ] );

        self.currentColorRowContainer.append( row[ 0 ]);

        self.colorPickerContainer.append(self.currentColorRowContainer[ 0 ]);

        function makeRow(r) {

            var rowContainer = $('<div class="grid-rect">'),
                row = $('<div class="grid">');

            count(4).forEach(function(c){
                row.append( makeColumn(r, c)[ 0 ] );
            });

            rowContainer.append(row);
            return rowContainer;
        }

        function makeColumn(r, c) {

            var column = $('<div class="col col-1-4">'),
                filler = $('<div class="col-filler">');

            filler.css( { "background-color" : palette[ r ][ c ] } );
            column.append( filler[ 0 ] );

            column.click(function () {

                igv.setTrackColor(self.trackView.track, $(this).find(".col-filler").css( "background-color" ));
                self.trackView.update();

            });

            return column;
        }

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

        this.trackColorTile.css( { "background-color" : this.trackView.track.color } );

        this.colorPickerContainer.show();
    };

    return igv;

})(igv || {});
