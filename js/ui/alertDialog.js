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

import makeDraggable from "./draggable";

const AlertDialog = function ($parent) {

    this.$parent = $parent;

    // container
    this.$container = $("<div>", {class: 'igv-alert-dialog-container'});
    $parent.append(this.$container);
    this.$container.offset({left: 0, top: 0});

    // header
    let $header = $("<div>");
    this.$container.append($header);

    // body container
    let $div = $("<div>", {id: 'igv-alert-dialog-body'});
    this.$container.append($div);

    // body copy
    this.$body = $("<div>", {id: 'igv-alert-dialog-body-copy'});
    $div.append(this.$body);

    let self = this;
    // attachDialogCloseHandlerWithParent($header, function () {
    //     self.$body.html('');
    //     self.$container.offset( { left:0, top:0 } );
    //     self.$container.hide();
    // });

    // ok container
    let $ok_container = $("<div>");
    this.$container.append($ok_container);

    // ok
    this.$ok = $("<div>");
    $ok_container.append(this.$ok);

    this.$ok.text('OK');

    this.$ok.on('click', function () {
        self.$body.html('');
        self.$container.offset({left: 0, top: 0});
        self.$container.hide();
    });

    makeDraggable(this.$container.get(0), $header.get(0));

    this.$container.hide();
};

AlertDialog.prototype.configure = function (config) {
    this.$body.html(config.label);
};

AlertDialog.prototype.presentMessageWithCallback = function (message, callback) {

    this.$body.text(message);

    let css =
        {
            left: (this.$parent.width() - this.$container.width()) / 2,
            top: (this.$parent.height() - this.$container.height()) / 2
        };
    this.$container.css(css);

    this.$container.show();

    this.$ok.text('OK');

    let self = this;
    this.$ok.on('click', function () {

        callback('OK');

        self.$body.html('');
        self.$container.offset({left: 0, top: 0});
        self.$container.hide();
    });

};


AlertDialog.prototype.present = function ($alternativeParent) {

    var obj,
        $p;

    $p = $alternativeParent || this.$parent;
    obj =
        {
            left: ($p.width() - this.$container.width()) / 2,
            top: ($p.height() - this.$container.height()) / 2

        };
    this.$container.css(obj);

    this.$container.show();
};

export default AlertDialog;