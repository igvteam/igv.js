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

    igv.Dialog = function (parentObject, userPalette) {

        var self = this,
            palette;

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

    };

    igv.Dialog.prototype.hide = function () {
        $(this.colorPickerContainer).offset( { left: 0, top: 0 } );
        this.colorPickerContainer.hide();
    };

    igv.Dialog.prototype.show = function () {

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
