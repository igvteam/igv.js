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

const XMLSession = function (xmlString, knownGenomes) {

    var self = this, parser, xmlDoc, elements;

    parser = new DOMParser();
    xmlDoc = parser.parseFromString(xmlString, "text/xml");

    processRootNode();

    elements = xmlDoc.getElementsByTagName("Resource");

    self.tracks = [];

    var resourceMap = {};
    Array.from(elements).forEach(function (r, idx) {
        var res = {
            url: r.getAttribute("path"),
            indexURL: r.getAttribute("index"),
            order: idx
        };
        self.tracks.push(res);
        resourceMap[res.url] = res;
    });

    // Check for optional Track section
    elements = xmlDoc.getElementsByTagName("Track");
    if (elements && elements.length > 0) {

        // Track order is defined by elements, reset
        self.tracks = [];

        Array.from(elements).forEach(function (track) {

            var id, res, claszz, subtracks, mergedTrack;

            subtracks = track.getElementsByTagName("Track");

            if (subtracks && subtracks.length > 0) {

                mergedTrack = {
                    type: 'merged',
                    tracks: []
                };
                extractTrackAttributes(track, mergedTrack);

                self.tracks.push(mergedTrack);

                Array.from(subtracks).forEach(function (t) {

                    t.processed = true;

                    var id, res;

                    id = t.getAttribute("id");
                    res = resourceMap[id];

                    if (res) {
                        mergedTrack.tracks.push(res);
                        extractTrackAttributes(t, res);
                        res.autoscale = false;
                        mergedTrack.height = res.height;      //
                    }
                })
            } else if (!track.processed) {
                id = track.getAttribute("id");
                res = resourceMap[id];
                if (res) {
                    self.tracks.push(res);
                    extractTrackAttributes(track, res);
                }

            }
        })
    }

    function extractTrackAttributes(track, config) {

        var color, height, autoScale, altColor, dataRange, dataRangeCltn, windowFunction, visWindow, indexed,
            autoscaleGroup;

        config.name = track.getAttribute("name");
        color = track.getAttribute("color");
        if (color) {
            config.color = "rgb(" + color + ")";
        }
        altColor = track.getAttribute("altColor");
        if (color) {
            config.altColor = "rgb(" + altColor + ")";
        }
        height = track.getAttribute("height");
        if (height) {
            config.height = parseInt(height);
        }
        autoScale = track.getAttribute("autoScale");
        if (autoScale) {
            config.autoScale = (autoScale === "true");
        }
        autoscaleGroup = track.getAttribute("autoscaleGroup");
        if (autoscaleGroup) {
            config.autoscaleGroup = autoscaleGroup;
        }
        windowFunction = track.getAttribute("windowFunction");
        if (windowFunction) {
            config.windowFunction = windowFunction;
        }
        visWindow = track.getAttribute("visibilityWindow") || track.getAttribute("featureVisibilityWindow");
        if (visWindow) {
            config.visibilityWindow = visWindow;
        }
        indexed = track.getAttribute("indexed");
        if (indexed) {
            config.indexed = (indexed === "true");
        }

        dataRangeCltn = track.getElementsByTagName("DataRange");
        if (dataRangeCltn.length > 0) {
            dataRange = dataRangeCltn.item(0);
            if (!autoScale) {
                config.min = parseInt(dataRange.getAttribute("minimum"));
                config.max = parseInt(dataRange.getAttribute("maximum"));
            }
            config.logScale = dataRange.getAttribute("type") === "LOG";
        }

    }

    function processRootNode() {
        var elements, session, genome, locus, ucscID;

        elements = xmlDoc.getElementsByTagName("Session");
        if (!elements || elements.length === 0) {
            //TODO throw error
        }
        session = elements.item(0);
        genome = session.getAttribute("genome");
        locus = session.getAttribute("locus");
        ucscID = session.getAttribute("ucscID");

        if (knownGenomes && knownGenomes.hasOwnProperty(genome)) {
            self.genome = genome;

        } else {
            self.reference = {
                fastaURL: genome
            }
            if (ucscID) {
                self.reference.id = ucscID;
            }
        }
        if (locus) {
            self.locus = locus;
        }

    }


};

export default XMLSession;
