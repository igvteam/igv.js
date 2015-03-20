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
 * Created by turner on 3/18/15.
 */
var igv = (function (igv) {

    igv.UserFeedback = function (parentObject) {

        var myself = this;

        this.userFeedback = $('<div class="igvUserFeedback">');
        parentObject.append(this.userFeedback[0]);

        // header
        this.userFeedbackHeader = $('<div class="igvUserFeedbackHeader">');
        this.userFeedback.append(this.userFeedbackHeader[0]);

        // alert
        this.userFeedbackAlert = $('<i class="fa fa-exclamation-triangle fa-20px igvUserFeedbackAlert">');
        this.userFeedbackHeader.append(this.userFeedbackAlert[0]);

        // dismiss
        this.userFeedbackDismiss = $('<i class="fa fa-times-circle fa-20px igvUserFeedbackDismiss">');
        this.userFeedbackHeader.append(this.userFeedbackDismiss[0]);

        this.userFeedbackDismiss.click(function () {
            myself.userFeedbackBodyCopy.html("");
            myself.userFeedback.hide();
        });

        // copy
        this.userFeedbackBodyCopy = $('<div class="igvUserFeedbackBodyCopy">');
        this.userFeedback.append(this.userFeedbackBodyCopy[0]);

    };

    igv.UserFeedback.prototype.show = function () {
        this.userFeedback.show();
    };

    igv.UserFeedback.prototype.hide = function () {
        this.userFeedback.hide();
    };

    igv.UserFeedback.prototype.bodyCopy = function (htmlString) {
        this.userFeedbackBodyCopy.html(htmlString);
    };

    return igv;

})(igv || {});