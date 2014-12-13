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


// Generic functions applicable to all track types

var igv = (function (igv) {


    igv.configTrack = function (track, config) {

        if (!config.type) config.type = igv.inferFileType(this.filename);

        track.config = config;
        track.url = config.url;
        track.label = config.label || "";
        track.id = config.id || config.label;
        track.order = config.order;
        track.color = config.color || "rgb(150,150,150)";

        track.type = config.type;

        track.height = config.height || ("bed" === config.type ? 100 : 50);

    };

    igv.setTrackHeight = function (track, newHeight) {

        if (track.minHeight != undefined) newHeight = Math.max(track.minHeight, newHeight);
        if (track.maxHeight != undefined) newHeight = Math.min(track.maxHeight, newHeight);
        track.height = newHeight;

        if (track.trackView) {
            track.trackView.setTrackHeight(newHeight);
        }
    };

    igv.setTrackLabel = function (track, label) {

        track.label = label;

        if (track.description) {

            track.labelButton.innerHTML = track.label;
        } else {

            track.labelSpan.innerHTML = track.label;
        }

        if(track.trackView) {
            track.trackView.repaint();
        }
    };

    igv.setTrackColor = function(track, color) {
        track.color = color;
        if(track.trackView) {
            track.trackView.repaint();
        }
    };


    return igv;
})(igv || {});