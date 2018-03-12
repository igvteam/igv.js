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

/**
 * Created by turner on 2/11/14.
 */
var igv = (function (igv) {

    igv.MergedTrack = function (config) {

        var self = this;

        if (!config.tracks) {
            console.log("Error: not tracks defined for merged track. " + config);
            return;
        }

        if(config.height === undefined) {
            config.height = 50;
        }

        igv.configTrack(this, config);

        this.tracks = [];
        config.tracks.forEach(function (tconf) {

            if(!tconf.type) igv.inferTrackTypes(tconf);

            var t = igv.createTrack(tconf);

            if (t) {
                t.autoscale = false;     // Scaling done from merged track
                self.tracks.push(t);
            }
            else {
                console.log("Could not create track " + tconf);
            }
        });

    }

    igv.MergedTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

        var promises = this.tracks.map(function (t) {
            return t.getFeatures(chr, bpStart, bpEnd, bpPerPixel);
        })
        return Promise.all(promises);

    }


    igv.MergedTrack.prototype.draw = function (options) {

        var i, len, mergedFeatures, trackOptions, dataRange;

        mergedFeatures = options.features;    // Array of feature arrays, 1 for each track

        dataRange = autoscale(options.genomicState.referenceFrame.chrName, mergedFeatures);

        for (i = 0, len = this.tracks.length; i < len; i++) {

            trackOptions = Object.assign({}, options);
            trackOptions.features = mergedFeatures[i];
            this.tracks[i].dataRange = dataRange;
            this.tracks[i].draw(trackOptions);
        }

    }

    igv.MergedTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

        var i, len, autoscale, track;

        autoscale = true;   // Hardcoded for now

        for (i = 0, len = this.tracks.length; i < len; i++) {

            track = this.tracks[i];

            if (typeof track.paintAxis === 'function') {
                track.paintAxis(ctx, pixelWidth, pixelHeight);
                if (autoscale) break;
            }
        }
    }

    function autoscale(chr, featureArrays) {


        var min = 0,
            max = -Number.MAX_VALUE,
            allValues;

        // if (chr === 'all') {
        //     allValues = [];
        //     featureArrays.forEach(function (features) {
        //         features.forEach(function (f) {
        //             if (!Number.isNaN(f.value)) {
        //                 allValues.push(f.value);
        //             }
        //         });
        //     });
        //
        //     min = Math.min(0, igv.Math.percentile(allValues, .1));
        //     max = igv.Math.percentile(allValues, 99.9);
        //
        // }
        // else {
            featureArrays.forEach(function (features) {
                features.forEach(function (f) {
                    if (!Number.isNaN(f.value)) {
                        min = Math.min(min, f.value);
                        max = Math.max(max, f.value);
                    }
                });
            });
      //  }

        return {min: min, max: max};
    }

    return igv;

})(igv || {});
