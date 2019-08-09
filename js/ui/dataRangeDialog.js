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

const DataRangeDialog = function ($parent, browser) {
    var self = this,
        $header,
        $buttons,
        $div;

    this.browser = browser;

    // dialog container
    this.$container = $("<div>", {class: 'igv-generic-dialog-container'});
    $parent.append(this.$container);
    this.$container.offset({left: 0, top: 0});

    // dialog header
    $header = $("<div>", {class: 'igv-generic-dialog-header'});
    this.$container.append($header);
    igv.attachDialogCloseHandlerWithParent($header, function () {
        self.$minimum_input.val(undefined);
        self.$maximum_input.val(undefined);
        self.$container.offset({left: 0, top: 0});
        self.$container.hide();
    });


    // minimun
    this.$minimum = $("<div>", {class: 'igv-generic-dialog-label-input'});
    this.$container.append(this.$minimum);
    //
    $div = $('<div>');
    $div.text('Minimum');
    this.$minimum.append($div);
    //
    this.$minimum_input = $("<input>");
    this.$minimum.append(this.$minimum_input);


    // maximum
    this.$maximum = $("<div>", {class: 'igv-generic-dialog-label-input'});
    this.$container.append(this.$maximum);
    //
    $div = $('<div>');
    $div.text('Maximum');
    this.$maximum.append($div);
    //
    this.$maximum_input = $("<input>");
    this.$maximum.append(this.$maximum_input);

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
        self.$minimum_input.val(undefined);
        self.$maximum_input.val(undefined);
        self.$container.offset({left: 0, top: 0});
        self.$container.hide();
    });

    //this.$container.draggable({ handle:$header.get(0) });
    makeDraggable(this.$container.get(0), $header.get(0));

    this.$container.hide();
};

DataRangeDialog.prototype.configure = function (config) {

    var self = this,
        dataRange,
        min,
        max;

    dataRange = config.trackView.dataRange();

    if (dataRange) {
        min = dataRange.min;
        max = dataRange.max;
    } else {
        min = 0;
        max = 100;
    }

    this.$minimum_input.val(min);
    this.$maximum_input.val(max);

    this.$minimum_input.unbind();
    this.$minimum_input.on('keyup', function (e) {
        if (13 === e.keyCode) {
            processResults.call(self, config);
        }
    });

    this.$maximum_input.unbind();
    this.$maximum_input.on('keyup', function (e) {
        if (13 === e.keyCode) {
            processResults.call(self, config);
        }
    });

    this.$ok.unbind();
    this.$ok.on('click', function () {
        processResults.call(self, config);
    });
};

function processResults(config) {
    var self = this,
        min,
        max;

    min = parseFloat(this.$minimum_input.val());
    max = parseFloat(this.$maximum_input.val());
    if (isNaN(min) || isNaN(max)) {
        self.browser.presentAlert("Must input numeric values", undefined);
    } else {

        if (true === config.trackView.track.autoscale) {
            $('#datarange-autoscale').trigger('click');
        }

        config.trackView.setDataRange(min, max, false);
    }

    this.$minimum_input.val(undefined);
    this.$maximum_input.val(undefined);
    this.$container.offset({left: 0, top: 0});
    this.$container.hide();
}

DataRangeDialog.prototype.present = function ($parent) {

    var offset_top,
        scroll_top;

    offset_top = $parent.offset().top;
    scroll_top = $('body').scrollTop();

    this.$container.offset({left: $parent.width() - this.$container.width(), top: (offset_top + scroll_top)});
    this.$container.show();
};

export default DataRangeDialog;