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

    var nColumns = 5;

    igv.ColorPicker = function (parentObject, userPalette) {

        var self = this,
            palette = userPalette || ["#666666", "#0000cc", "#009900", "#cc0000", "#ffcc00", "#9900cc", "#00ccff", "#ff6600", "#ff6600"],
            nRows = Math.ceil(palette.length / nColumns),
            rowIdx;

        this.rgb_re = /^\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])\s*,\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])\s*,\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])\s*$/;
        this.hex_re = new RegExp('^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$');

        this.container = $('<div class="igv-grid-container-colorpicker">');
        parentObject.append(this.container[0]);

        this.container.draggable();

        this.header = $('<div class="igv-grid-header">');
        this.headerBlurb = $('<div class="igv-grid-header-blurb">');

        this.header.append(this.headerBlurb[0]);

        igv.dialogCloseWithParentObject(this.header, function () {
            self.hide();
        });

        this.container.append(this.header[0]);


        // color palette
        for (rowIdx = 0; rowIdx < nRows; rowIdx++) {
            self.container.append(makeRow(palette.slice(rowIdx * nColumns))[0]);
        }

        // dividing line
        self.container.append($('<hr class="igv-grid-dividing-line">')[0]);

        // user colors
        self.container.append(rowOfUserColors()[0]);

        //// dividing line
        //self.container.append($('<hr class="igv-grid-dividing-line">')[ 0 ]);

        // initial track color
        self.container.append(rowOfPreviousColor()[0]);

        //// dividing line
        //self.container.append($('<hr class="igv-grid-dividing-line">')[ 0 ]);

        // initial track color
        self.container.append(rowOfDefaultColor()[0]);

        function rowOfUserColors() {

            var rowContainer,
                row,
                column,
                filler,
                userColorInput,
                digit

            self.userColors = [];

            for (digit = 0; digit < 5; digit++) {
                self.userColors.push(rowHidden(digit));
                self.container.append(self.userColors[digit][0]);
            }

            self.userColorsIndex = undefined;
            self.userColorsRowIndex = 0;

            row = $('<div class="igv-grid-colorpicker">');

            // column
            column = $('<div class="igv-col igv-col-7-8">');
            userColorInput = $('<input class="igv-user-input-colorpicker" type="text" placeholder="Ex: #ff0000 or 255,0,0">');
            userColorInput.change(function () {

                var parsed = parseColor($(this).val());

                if (undefined !== parsed) {

                    igv.setTrackColor(self.trackView.track, parsed);
                    self.trackView.update();
                    addUserColor(parsed);

                    $(this).val("");
                    $(this).attr("placeholder", "Ex: #ff0000 or 255,0,0");

                    self.userColorFeeback.css("background-color", "white");

                } else {
                    self.userError.show();
                }

            });

            userColorInput.mousedown(function () {
                $(this).attr("placeholder", "");
            });

            userColorInput.keyup(function () {

                var parsed;

                if ("" === $(this).val()) {
                    self.userError.hide();
                    $(this).attr("placeholder", "Ex: #ff0000 or 255,0,0");
                }

                parsed = parseColor($(this).val());

                if (undefined !== parsed) {
                    self.userError.hide();
                    self.userColorFeeback.css("background-color", parsed);
                } else {
                    self.userColorFeeback.css("background-color", "white");
                }

            });

            column.append(userColorInput[0]);
            row.append(column[0]);

            // color feedback.
            column = makeColumn(0, 0, null);
            self.userColorFeeback = column.find("div").first();

            row.append(column);

            rowContainer = $('<div class="igv-grid-rect">');
            rowContainer.append(row[0]);

            // user feedback
            self.userError = $('<span>');
            self.userError.text("ERROR.    Ex: #ff0000 or 255,0,0");
            self.userError.hide();

            row = $('<div class="igv-grid-colorpicker-user-error">');
            row.append(self.userError[0]);
            rowContainer.append(row);

            function parseColor(value) {

                var rgb,
                    hex;

                rgb = self.rgb_re.exec(value);
                if (null !== rgb) {

                    return "rgb(" + rgb[0] + ")";
                } else {

                    hex = self.hex_re.exec(value);
                    if (null !== hex) {

                        return igv.hex2Color(hex[0]);
                    }
                }

                return undefined;
            }

            function addUserColor(color) {

                if (undefined === self.userColorsIndex) {

                    self.userColorsIndex = 0;
                    self.userColorsRowIndex = 0;
                } else if (8 === self.userColorsRowIndex) {

                    self.userColorsRowIndex = 0;
                    self.userColorsIndex = (1 + self.userColorsIndex) % self.userColors.length;
                }

                presentUserColor(color, self.userColorsIndex, self.userColorsRowIndex);

                ++(self.userColorsRowIndex);

            }

            function presentUserColor(color, c, r) {

                var rowContainer,
                    filler;

                rowContainer = self.userColors[c];
                rowContainer.removeClass("igv-grid-rect-hidden");
                rowContainer.addClass("igv-grid-rect");

                filler = rowContainer.find(".igv-grid-colorpicker").find(".igv-col").find("div").eq(r);
                filler.removeClass("igv-col-filler-no-color");
                filler.addClass("igv-col-filler");

                filler.css("background-color", color);

                filler.click(function () {

                    igv.setTrackColor(self.trackView.track, $(this).css("background-color"));
                    self.trackView.update();

                });

            }

            return rowContainer;

        }

        function rowOfDefaultColor() {

            var rowContainer,
                row,
                column;

            row = $('<div class="igv-grid-colorpicker">');

            // initial color tile
            self.defaultTrackColorTile = $('<div class="igv-col-filler">');
            self.defaultTrackColorTile.css("background-color", "#eee");

            column = $('<div class="igv-col igv-col-1-8">');
            column.append(self.defaultTrackColorTile[0]);

            column.click(function () {
                igv.setTrackColor(self.trackView.track, $(this).find(".igv-col-filler").css("background-color"));
                self.trackView.update();
            });

            row.append(column[0]);


            // default color label
            column = $('<div class="igv-col igv-col-7-8 igv-col-label">');
            column.text("Default Color");
            row.append(column[0]);


            rowContainer = $('<div class="igv-grid-rect">');
            rowContainer.append(row[0]);

            return rowContainer;
        }

        function rowOfPreviousColor() {

            var rowContainer,
                row,
                column;

            row = $('<div class="igv-grid-colorpicker">');

            // initial color tile
            self.previousTrackColorTile = $('<div class="igv-col-filler">');
            self.previousTrackColorTile.css("background-color", "#eee");

            column = $('<div class="igv-col igv-col-1-8">');
            column.append(self.previousTrackColorTile[0]);

            column.click(function () {
                igv.setTrackColor(self.trackView.track, $(this).find(".igv-col-filler").css("background-color"));
                self.trackView.update();
            });

            row.append(column[0]);


            // initial color label
            column = $('<div class="igv-col igv-col-7-8 igv-col-label">');
            column.text("Previous Color");
            row.append(column[0]);


            rowContainer = $('<div class="igv-grid-rect">');
            rowContainer.append(row[0]);

            return rowContainer;
        }

        function rowHidden(rowIndex) {

            var rowContainer = $('<div class="igv-grid-rect-hidden">'),
                row = $('<div class="igv-grid-colorpicker">'),
                columnIndex;

            for (columnIndex = 0; columnIndex < nColumns; columnIndex++) {
                row.append(makeColumn(rowIndex, columnIndex, null)[0]);
            }


            rowContainer.append(row);
            return rowContainer;
        }

        function makeRow(colors) {

            var rowContainer = $('<div class="igv-grid-rect">'),
                row = $('<div class="igv-grid-colorpicker">'),
                i;

            for (i = 0; i < Math.min(nColumns, colors.length); i++) {
                row.append(makeColumn(colors[i])[0]);
            }

            rowContainer.append(row);
            return rowContainer;
        }

        function makeColumn(colorOrNull) {

            var column = $('<div class="igv-col igv-col-1-8">'),
                filler = $('<div>');

            column.append(filler[0]);

            if (null !== colorOrNull) {

                filler.addClass("igv-col-filler");
                filler.css("background-color", colorOrNull);

                filler.click(function () {

                    igv.setTrackColor(self.trackView.track, $(this).css("background-color"));
                    self.trackView.update();

                });

            } else {
                filler.addClass("igv-col-filler-no-color");
                filler.css("background-color", "white");
            }

            return column;
        }

    };

    igv.ColorPicker.prototype.hide = function () {
        $(this.container).offset({left: 0, top: 0});
        this.container.hide();
    };

    igv.ColorPicker.prototype.show = function () {

        var body_scrolltop = $("body").scrollTop(),
            track_origin = $(this.trackView.trackDiv).offset(),
            track_size = {
                width: $(this.trackView.trackDiv).outerWidth(),
                height: $(this.trackView.trackDiv).outerHeight()
            },
            size = {width: $(this.container).outerWidth(), height: $(this.container).outerHeight()},
            obj;

        //$(this.container).offset( { left: (track_size.width - size.width)/2, top: track_origin.top } );

        $(this.container).offset({left: (track_size.width - 300), top: (track_origin.top + body_scrolltop)});

        this.previousTrackColorTile.css("background-color", this.trackView.track.color);

        this.defaultTrackColorTile.css("background-color", (this.trackView.track.defaultColor || igv.constants.defaultColor));

        obj = $(".igv-user-input-color");
        obj.val("");
        obj.attr("placeholder", "Ex: #ff0000 or 255,0,0");

        this.container.show();
        this.userError.hide();

        $(this.container).offset(igv.constrainBBox($(this.container), $(igv.browser.trackContainerDiv)));

    };

    return igv;

})(igv || {});
