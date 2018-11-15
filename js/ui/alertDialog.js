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

    igv.AlertDialog = function ($parent, browser) {
        var self = this,
            $header,
            $ok_container;

        this.$parent = $parent;
        this.browser = browser;

        // dialog container
        this.$container = $("<div>", { class:'igv-generic-dialog-container' });
        $parent.append(this.$container);
        this.$container.offset( { left:0, top:0 } );

        // dialog header
        $header = $("<div>", { class:'igv-generic-dialog-header' });
        this.$container.append($header);
        igv.attachDialogCloseHandlerWithParent($header, function () {
            self.$label.html('');
            self.$container.offset( { left:0, top:0 } );
            self.$container.hide();
        });

        // dialog label
        this.$label = $("<div>", { class:'igv-generic-dialog-one-liner'});
        this.$container.append(this.$label);
        self.$label.html('');

        // ok container
        $ok_container = $("<div>", { class:'igv-generic-dialog-ok' });
        this.$container.append($ok_container);

        // ok
        this.$ok = $("<div>");
        $ok_container.append(this.$ok);

        this.$ok.text('OK');

        this.$ok.on('click', function () {
            self.$label.html('');
            self.$container.offset( { left:0, top:0 } );
            self.$container.hide();
        });

        //this.$container.draggable({ handle:$header.get(0) });
        igv.makeDraggable(this.$container.get(0), $header.get(0));

        this.$container.hide();
    };

    igv.AlertDialog.prototype.configure = function (config) {
        this.$label.html(config.label);
    };

    igv.AlertDialog.prototype.presentMessageWithCallback = function (message, callback) {

        this.$label.text(message);

        let css =
            {
                left: (this.$parent.width() - this.$container.width())/2,
                top: (this.$parent.height() - this.$container.height())/2
            };
        this.$container.css(css);

        this.$container.show();

        this.$ok.text('OK');

        let self = this;
        this.$ok.on('click', function () {

            callback('OK');

            self.$label.html('');
            self.$container.offset( { left:0, top:0 } );
            self.$container.hide();
        });

    };


    igv.AlertDialog.prototype.present = function ($alternativeParent) {

        var obj,
            $p;

        $p = $alternativeParent || this.$parent;
        obj =
            {
                left: ($p.width() - this.$container.width())/2,
                top: ($p.height() - this.$container.height())/2

            };
        this.$container.css(obj);

        this.$container.show();
    };

    return igv;

})(igv || {});