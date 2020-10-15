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

const IdeogramTrack = function (browser) {

    this.browser = browser

    this.type = 'ideogram'
    this.id = this.type

    this.height = 16

    this.order = Number.MIN_SAFE_INTEGER;

    this.disableButtons = true;
    this.ignoreTrackMenu = true;

}

IdeogramTrack.prototype.getFeatures = async function (chr, start, end) {
    return [];
};

IdeogramTrack.prototype.computePixelHeight = function (ignore) {
    return this.height;
};

IdeogramTrack.prototype.draw = function (options) {
    console.log('Ideogram Track - draw()')
}

IdeogramTrack.prototype.computePixelHeight = function () {

}

IdeogramTrack.prototype.dispose = function () {
    this.trackView = undefined
}

export default IdeogramTrack
