/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
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
import {attachDialogCloseHandlerWithParent} from "./ui-utils";

const InputDialog = function ($parent) {
    var self = this,
        $header,
        $buttons;


    // dialog container
    this.$container = $("<div>", {class: 'igv-generic-dialog-container'});
    $parent.append(this.$container);
    this.$container.offset({left: 0, top: 0});

    // dialog header
    $header = $("<div>", {class: 'igv-generic-dialog-header'});
    this.$container.append($header);
    attachDialogCloseHandlerWithParent($header, function () {
        self.$input.val(undefined);
        self.$container.offset({left: 0, top: 0});
        self.$container.hide();
    });

    // dialog label
    this.$label = $("<div>", {class: 'igv-generic-dialog-one-liner'});
    this.$container.append(this.$label);
    this.$label.text('Unlabeled');

    // input container
    this.$input_container = $("<div>", {class: 'igv-generic-dialog-input'});
    this.$container.append(this.$input_container);
    //
    this.$input = $("<input>");
    this.$input_container.append(this.$input);


    // ok | cancel
    $buttons = $("<div>", {class: 'igv-generic-dialog-ok-cancel'});
    this.$container.append($buttons);

    // ok
    this.$ok = $("<div>");
    $buttons.append(this.$ok);
    this.$ok.text('OK');

    // cancel
    this.$cancel = $("<div>");
    $buttons.append(this.$cancel);
    this.$cancel.text('Cancel');

    this.$cancel.on('click', function () {
        self.$input.val(undefined);
        self.$container.offset({left: 0, top: 0});
        self.$container.hide();
    });

    //this.$container.draggable({ handle:$header.get(0) });
    makeDraggable(this.$container.get(0), $header.get(0));

    this.$container.hide();
};

InputDialog.prototype.configure = function (config) {

    var self = this;

    this.$label.text(config.label);

    this.$input.val(config.input);

    this.$input.unbind();
    this.$input.on('keyup', function (e) {
        if (13 === e.keyCode) {
            config.click();
            self.$input.val(undefined);
            self.$container.offset({left: 0, top: 0});
            self.$container.hide();
        }
    });

    this.$ok.unbind();
    this.$ok.on('click', function () {

        config.click();

        self.$input.val(undefined);
        self.$container.offset({left: 0, top: 0});
        self.$container.hide();
    });

};

InputDialog.prototype.present = function ($parent) {

    var offset_top,
        scroll_top;

    offset_top = $parent.offset().top;
    scroll_top = $('body').scrollTop();

    this.$container.offset({left: $parent.width() - this.$container.width(), top: (offset_top + scroll_top)});
    this.$container.show();
};

export default InputDialog;
