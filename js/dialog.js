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

    igv.Dialog = function (parentObject, inputChange) {

        var self = this;

        this.rgb_re = /([012]\d\d|\d\d{0,1})(\s*?,\s*?)([012]\d\d|\d\d{0,1})(\s*?,\s*?)([012]\d\d|\d\d{0,1})/;
        this.hex_re = new RegExp('^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$');

        this.container = $('<div class="grid-container-dialog ui-widget-content">');
        parentObject.append( this.container[ 0 ] );

        this.container.draggable();

        this.header = $('<div class="grid-header">');
        this.headerBlurb = $('<div class="grid-header-blurb">');

        this.header.append(this.headerBlurb[ 0 ]);

        igv.dialogCloseWithParentObject(this.header, function () {
            self.hide();
        });

        this.container.append(this.header[ 0 ]);



        // user colors
        self.container.append(rowOfTrackName()[ 0 ]);

        function rowOfTrackName() {

            var rowContainer,
                row,
                column;

            row = $('<div class="grid-colorpicker">');

            column = $('<div class="col col-4-4">');
            self.trackNameInput = $('<input class="user-color-input" type="text" value="#000000">');
            self.trackNameInput.change(function () {

                var raw = $(this).val(),
                    cooked;

                cooked = raw;
                if ("" === raw) {
                    cooked = "untitled";
                }

                igv.setTrackLabel(self.trackView.track, cooked);
                self.trackView.update();
                self.hide();

                //var color = parseColor($(this).val());
                //
                //if (undefined !== color) {
                //    igv.setTrackColor(self.trackView.track, color);
                //    self.trackView.update();
                //}

            });

            //self.trackNameInput.keyup(function() {
            //
            //    var value = $(this).val(),
            //        color;
            //
            //    if ("" === value) {
            //        $(this).css( { "color" : "#222222" } );
            //        return;
            //    }
            //
            //    color = parseColor($(this).val());
            //    if (undefined !== color) {
            //        $(this).css( { "color" : color } );
            //    }
            //
            //});

            column.append( self.trackNameInput[ 0 ] );
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

            return rowContainer;

        }

    };

    igv.Dialog.prototype.hide = function () {
        $(this.container).offset( { left: 0, top: 0 } );
        this.container.hide();
    };

    igv.Dialog.prototype.show = function () {

        var track_origin = $(this.trackView.trackDiv).offset(),
            track_size = { width: $(this.trackView.trackDiv).outerWidth(), height: $(this.trackView.trackDiv).outerHeight()},
            size = { width: $(this.container).outerWidth(), height: $(this.container).outerHeight()};

        $(this.container).offset( { left: (track_size.width - size.width)/2, top: track_origin.top } );

        this.headerBlurb.text("Track Name");
        this.trackNameInput.val(this.trackView.track.name);

        this.container.show();
    };

    return igv;

})(igv || {});
