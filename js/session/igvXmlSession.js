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
 * Minimal support for the legacy IGV desktop session format.
 */

var igv = (function (igv) {

    var stringAttributes = ["name"],
        colorAttributes = ["color", "altColor"],
        intAttributes = ["height", "featureVisibilityWindow"],
        booleanAttributes = ["autoScale"];

    igv.XMLSession = function (xmlString) {

        var self = this,
            parser = new DOMParser(),
            xmlDoc = parser.parseFromString(xmlString, "text/xml"),
            elements = xmlDoc.getElementsByTagName("Resource");

        self.tracks = [];

        var resourceMap = {};


        Array.from(elements).forEach(function (res, idx) {

            var res = {
                url: res.getAttribute("path"),
                order: idx
            };
            self.tracks.push(res);
            resourceMap[res.url] = res;
        });

        elements = xmlDoc.getElementsByTagName("Track");
        Array.from(elements).forEach(function (track) {

            var id, res, color, height, autoScale, altColor, dataRange, dataRangeCltn;

            id = track.getAttribute("id"),
                res = resourceMap[id];

            if (res) {

                res.name = track.getAttribute("name");
                color = track.getAttribute("color");
                if(color) {
                    res.color = "rgb(" + color + ")";
                }
                altColor = track.getAttribute("altColor");
                if(color) {
                    res.altColor = "rgb(" + altColor + ")";
                }
                height = track.getAttribute("height");
                if(height) {
                    res.height = parseInt(height);
                }
                autoScale = track.getAttribute("autoScale");
                if(autoScale) {
                    res.autoScale = (autoScale === "true");
                }

                dataRangeCltn = track.getElementsByTagName("DataRange");
                if(dataRangeCltn.length > 0) {
                    dataRange = dataRangeCltn.item(0);
                    if(!autoScale) {
                        res.min = parseInt(dataRange.getAttribute("minimum"));
                        res.max = parseInt(dataRange.getAttribute("maximum"));
                    }
                    res.logScale = dataRange.getAttribute("type") === "LOG";
                }


            }
        })


    };


    return igv;

})
(igv || {});
