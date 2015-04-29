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

        this.rgb_re = /([012]\d\d|\d\d{0,1})(\s*?,\s*?)([012]\d\d|\d\d{0,1})(\s*?,\s*?)([012]\d\d|\d\d{0,1})/;
        this.hex_re = new RegExp('^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$');

        this.colorPickerContainer = $('<div class="grid-container-colorpicker ui-widget-content">');
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

        // color palette
        count(palette.length).forEach(function(r){
            self.colorPickerContainer.append(makeRow(r)[ 0 ]);
        });

        // dividing line
        self.colorPickerContainer.append($('<hr class="grid-dividing-line">')[ 0 ]);

        // user colors
        self.colorPickerContainer.append(rowOfUserColors()[ 0 ]);

        // dividing line
        self.colorPickerContainer.append($('<hr class="grid-dividing-line">')[ 0 ]);

        // initial track color
        self.colorPickerContainer.append(rowOfInitialColor()[ 0 ]);

        function rowOfUserColors() {

            var rowContainer,
                row,
                column,
                filler,
                userColorInput;

            self.userColors = [];

            count(8).forEach(function(c){
                self.userColors.push(hiddenRow());
                self.colorPickerContainer.append(self.userColors[ c ][ 0 ]);
            });

            self.userColorsIndex = undefined;
            self.userColorsRowIndex = 0;

            row = $('<div class="grid-colorpicker">');

            //// column
            //column = $('<div class="col col-1-4">');
            //filler = $('<div class="col-filler-user-color">');
            //filler.css( { "background-color" : "#000000" } );
            //column.append(filler[ 0 ]);
            //row.append( column[ 0 ] );

            // column
            column = $('<div class="col col-4-4">');
            userColorInput = $('<input class="user-color-input" type="text" value="#000000">');
            userColorInput.change(function () {

                var color = parseColor($(this).val());

                if (undefined !== color) {
                    igv.setTrackColor(self.trackView.track, color);
                    self.trackView.update();
                    addUserColor( color );
                }


            });

            userColorInput.keyup(function() {

                var value = $(this).val(),
                    color;

                if ("" === value) {
                    $(this).css( { "color" : "#222222" } );
                    return;
                }

                color = parseColor($(this).val());
                if (undefined !== color) {
                    $(this).css( { "color" : color } );
                }

            });

            column.append( userColorInput[ 0 ] );
            row.append( column[ 0 ] );

            rowContainer = $('<div class="grid-rect">');
            rowContainer.append( row[ 0 ]);

            function parseColor(value) {

                var rgb,
                    hex;

                rgb = self.rgb_re.exec(value);

                if (null !== rgb) {
                    return "rgb(" + rgb[ 0 ] + ")";
                } else {
                    hex = self.hex_re.exec(value);
                    if (null !== hex) {
                        return igv.hex2Color( hex[ 0 ] );
                    }
                }

                return undefined;
            }

            function addUserColor(hex) {

                if (undefined === self.userColorsIndex) {

                    self.userColorsIndex = 0;
                    self.userColorsRowIndex = 0;
                } else if (4 === self.userColorsRowIndex) {

                    self.userColorsRowIndex = 0;
                    self.userColorsIndex = (1 + self.userColorsIndex) % self.userColors.length;
                }

                presentUserColor(hex, self.userColorsIndex, self.userColorsRowIndex);

                ++(self.userColorsRowIndex);

            }

            function presentUserColor(hex, c, r) {

                var rowContainer,
                    filler;

                rowContainer = self.userColors[ c ];
                rowContainer.removeClass( "grid-rect-gone" );
                rowContainer.addClass( "grid-rect" );

                filler = rowContainer.find(".grid").find(".col").find(".col-filler").eq(r);
                filler.css( { "background-color" : hex } );

            }

            return rowContainer;

        }

        function rowOfInitialColor() {

            var rowContainer,
                row,
                column;

            row = $('<div class="grid-colorpicker">');

            // initial color tile
            self.trackColorTile = $('<div class="col-filler">');
            self.trackColorTile.css( { "background-color" : "#eee" } );

            column = $('<div class="col col-1-4">');
            column.append( self.trackColorTile[ 0 ] );

            column.click(function(){
                igv.setTrackColor(self.trackView.track, $(this).find(".col-filler").css( "background-color" ));
                self.trackView.update();
            });

            row.append( column[ 0 ] );


            // initial color label
            column = $('<div class="col col-3-4 col-label">');
            column.text("Initial color");
            row.append( column[ 0 ] );


            rowContainer = $('<div class="grid-rect">');
            rowContainer.append(row[ 0 ]);

            return rowContainer;
        }

        function hiddenRow(r) {

            var rowContainer = $('<div class="grid-rect-hidden">'),
                row = $('<div class="grid-colorpicker">');

            count(4).forEach(function(c){
                row.append( makeColumn(r, c, "#eeeeee")[ 0 ] );
            });

            rowContainer.append(row);
            return rowContainer;
        }

        function makeRow(r) {

            var rowContainer = $('<div class="grid-rect">'),
                row = $('<div class="grid-colorpicker">');

            count(4).forEach(function(c){
                row.append( makeColumn(r, c, palette[ r ][ c ])[ 0 ] );
            });

            rowContainer.append(row);
            return rowContainer;
        }

        function makeColumn(r, c, color) {

            var column = $('<div class="col col-1-4">'),
                filler = $('<div class="col-filler">');

            filler.css( { "background-color" : color } );
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

        this.colorPickerHeaderBlurb.text(this.trackView.track.name);

        this.trackColorTile.css( { "background-color" : this.trackView.track.color } );

        this.colorPickerContainer.show();
    };

    return igv;

})(igv || {});
