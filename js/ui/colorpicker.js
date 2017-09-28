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

    var columnCount = 8;

    igv.ColorPicker = function ($parent, userPalette) {

        var self = this,
            palette = userPalette || ["#666666", "#0000cc", "#009900", "#cc0000", "#ffcc00", "#9900cc", "#00ccff", "#ff6600", "#ff6600"],
            rowCount = Math.ceil(palette.length / columnCount),
            rowIndex;

        this.rgb_re = /^\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])\s*,\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])\s*,\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])\s*$/;
        this.hex_re = new RegExp('^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$');

        this.$container = $('<div class="igv-grid-container-colorpicker">');
        $parent.append(this.$container);


        this.$header = $('<div class="igv-grid-header">');
        this.$headerBlurb = $('<div class="igv-grid-header-blurb">');

        this.$header.append(this.$headerBlurb);

        igv.attachDialogCloseHandlerWithParent(this.$header, function () {
            self.hide();
        });

        this.$container.append(this.$header);

        igv.makeDraggable(this.$container, this.$header);

        // color palette
        for (rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            self.$container.append(makeRow(palette.slice(rowIndex * columnCount)));
        }

        // dividing line
        self.$container.append($('<hr class="igv-grid-dividing-line">'));

        // user colors
        self.$container.append(rowOfUserColors());

        //// dividing line
        //self.$container.append($('<hr class="igv-grid-dividing-line">')[ 0 ]);

        // initial track color
        self.$container.append(rowOfPreviousColor());

        //// dividing line
        //self.$container.append($('<hr class="igv-grid-dividing-line">')[ 0 ]);

        // initial track color
        self.$container.append(rowOfDefaultColor());

        function rowOfUserColors() {

            var $rowContainer,
                $row,
                $column,
                $userColorInput,
                digit;

            self.userColors = [];

            // Provide 5 rows of user color pallete real estate
            for (digit = 0; digit < 5; digit++) {

                $row = rowHidden(digit);
                self.userColors.push($row);
                self.$container.append( $row[ 0 ] );

                $row.find('.igv-col-filler-no-color').addClass("igv-grid-rect-hidden");
            }

            self.userColorsIndex = undefined;
            self.userColorsRowIndex = 0;

            $row = $('<div class="igv-grid-colorpicker">');

            // color input
            $column = $('<div class="igv-col igv-col-7-8">');
            $userColorInput = $('<input class="igv-user-input-colorpicker" type="text" placeholder="Ex: #ff0000 or 255,0,0">');
            $userColorInput.change(function () {

                var parsed = parseColor($(this).val());

                if (parsed) {

                    // self.trackView.setColor( parsed );
                    self.colorUpdateHandler(parsed);

                    addUserColor(parsed);

                    $(this).val("");
                    $(this).attr("placeholder", "Ex: #ff0000 or 255,0,0");

                    self.$userColorFeeback.css("background-color", "white");
                    self.$userColorFeeback.hide();

                } else {
                    self.$userError.show();
                }

            });

            $userColorInput.mousedown(function () {
                $(this).attr("placeholder", "");
            });

            $userColorInput.keyup(function () {

                var parsed;

                if ("" === $(this).val()) {
                    self.$userError.hide();
                    $(this).attr("placeholder", "Ex: #ff0000 or 255,0,0");
                }

                parsed = parseColor($(this).val());

                if (undefined !== parsed) {
                    self.$userColorFeeback.css("background-color", parsed);
                    self.$userColorFeeback.show();
                } else {
                    self.$userColorFeeback.css("background-color", "white");
                    self.$userColorFeeback.hide();
                }

            });

            $column.append($userColorInput);
            $row.append($column);


            // color feedback chip
            $column = makeColumn(null);
            self.$userColorFeeback = $column.find("div").first();
            $row.append($column);
            self.$userColorFeeback.hide();

            $rowContainer = $('<div class="igv-grid-rect">');
            $rowContainer.append($row);



            // user feedback
            self.$userError = $('<span>');
            self.$userError.text("ERROR.    Ex: #ff0000 or 255,0,0");
            self.$userError.hide();

            $row = $('<div class="igv-grid-colorpicker-user-error">');
            $row.append(self.$userError);
            $rowContainer.append($row);

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
                } else if (columnCount === self.userColorsRowIndex) {

                    self.userColorsRowIndex = 0;
                    self.userColorsIndex = (1 + self.userColorsIndex) % self.userColors.length;
                }

                presentUserColor(color, self.userColorsIndex, self.userColorsRowIndex);

                ++(self.userColorsRowIndex);

            }

            function presentUserColor(color, c, r) {

                var $rowContainer,
                    $filler;

                $rowContainer = self.userColors[ c ];
                $rowContainer.removeClass("igv-grid-rect-hidden");
                $rowContainer.addClass("igv-grid-rect");

                $filler = $rowContainer.find(".igv-grid-colorpicker").find(".igv-col").find("div").eq( r );

                $filler.removeClass("igv-col-filler-no-color");
                $filler.removeClass("igv-grid-rect-hidden");

                $filler.addClass("igv-col-filler");

                $filler.css("background-color", color);

                $filler.click(function () {
                    // self.trackView.setColor( $(this).css("background-color") );
                    self.colorUpdateHandler($(this).css("background-color"));
                });

            }

            return $rowContainer;

        }

        function rowOfDefaultColor() {

            var $rowContainer,
                $row,
                $column;

            $row = $('<div class="igv-grid-colorpicker">');

            // initial color tile
            self.$defaultColor = $('<div class="igv-col-filler">');
            self.$defaultColor.css("background-color", "#eee");

            $column = $('<div class="igv-col igv-col-1-8">');
            $column.append(self.$defaultColor);

            $column.click(function () {
                // self.trackView.setColor( $(this).find(".igv-col-filler").css("background-color") );
                self.colorUpdateHandler( $(this).find(".igv-col-filler").css("background-color") );
            });

            $row.append($column);


            // default color label
            $column = $('<div class="igv-col igv-col-7-8 igv-col-label">');
            $column.text("Default Color");
            $row.append($column);


            $rowContainer = $('<div class="igv-grid-rect">');
            $rowContainer.append($row);

            return $rowContainer;
        }

        function rowOfPreviousColor() {

            var $rowContainer,
                $row,
                $column;

            $row = $('<div class="igv-grid-colorpicker">');

            // initial color tile
            self.$previousColor = $('<div class="igv-col-filler">');
            self.$previousColor.css("background-color", "#eee");

            $column = $('<div class="igv-col igv-col-1-8">');
            $column.append(self.$previousColor);

            $column.click(function () {
                // self.trackView.setColor( $(this).find(".igv-col-filler").css("background-color") );
                self.colorUpdateHandler( $(this).find(".igv-col-filler").css("background-color") );
            });

            $row.append($column);


            // initial color label
            $column = $('<div class="igv-col igv-col-7-8 igv-col-label">');
            $column.text("Previous Color");
            $row.append($column);


            $rowContainer = $('<div class="igv-grid-rect">');
            $rowContainer.append($row);

            return $rowContainer;
        }

        function rowHidden(rowIndex) {

            var $rowContainer = $('<div class="igv-grid-rect-hidden">'),
                $row = $('<div class="igv-grid-colorpicker">'),
                columnIndex;

            for (columnIndex = 0; columnIndex < columnCount; columnIndex++) {
                $row.append(makeColumn(null));
            }

            $rowContainer.append($row);
            return $rowContainer;
        }

        function makeRow(colors) {

            var $rowContainer = $('<div class="igv-grid-rect">'),
                $row = $('<div class="igv-grid-colorpicker">'),
                i;

            for (i = 0; i < Math.min(columnCount, colors.length); i++) {
                $row.append(makeColumn(colors[i]));
            }

            $rowContainer.append($row);
            return $rowContainer;
        }

        function makeColumn(colorOrNull) {

            var $column = $('<div class="igv-col igv-col-1-8">'),
                $filler = $('<div>');

            $column.append($filler);

            if (null !== colorOrNull) {

                $filler.addClass("igv-col-filler");
                $filler.css("background-color", colorOrNull);

                $filler.click(function () {
                    // self.trackView.setColor( $(this).css("background-color") );
                    self.colorUpdateHandler( $(this).css("background-color") );
                });

            } else {
                $filler.addClass("igv-col-filler-no-color");
                $filler.css("background-color", "white");
            }

            return $column;
        }

    };

    igv.ColorPicker.prototype.configure = function (trackView, trackColor, trackDefaultColor, offset, colorUpdateHandler) {
        this.$previousColor.css("background-color", trackColor);
        this.$defaultColor.css("background-color", trackDefaultColor);
        $(this.$container).offset(offset);
        this.colorUpdateHandler = colorUpdateHandler;
    };

    igv.ColorPicker.prototype.hide = function () {
        $(this.$container).offset({left: 0, top: 0});
        this.$container.hide();
    };

    igv.ColorPicker.prototype.presentAtOffset = function (offset) {
        this.$container.show();
        this.$userError.hide();
    };

    return igv;

})(igv || {});
