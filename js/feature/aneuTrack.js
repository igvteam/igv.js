/*R
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

var igv = (function (igv) {

    var debug = false;

    var log = function (msg) {
        if (debug) {
            var d = new Date();
            var time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
            if (typeof copy != "undefined") {
                copy(msg);
            }
            if (typeof console != "undefined") {
                console.log("AneuTrack: " + time + " " + msg);
            }

        }
    };
    var sortDirection = 1;

    igv.AneuTrack = function (config) {

        igv.configTrack(this, config);

        this.maxHeight = config.maxHeight - 2 || 500;
        this.sampleSquishHeight = config.sampleSquishHeight || 20;
        this.sampleExpandHeight = config.sampleExpandHeight || 125;

        this.sampleHeight = this.sampleExpandHeight;

        this.highColor = config.highColor || 'rgb(30,30,255)';
        this.lowColor = config.lowColor || 'rgb(220,0,0)';
        this.midColor = config.midColor || 'rgb(150,150,150)';
        this.posColorScale = config.posColorScale || new igv.GradientColorScale({
            low: 0.1,
            lowR: 255,
            lowG: 255,
            lowB: 255,
            high: 1.5,
            highR: 255,
            highG: 0,
            highB: 0
        });
        this.negColorScale = config.negColorScale || new igv.GradientColorScale({
            low: -1.5,
            lowR: 0,
            lowG: 0,
            lowB: 255,
            high: -0.1,
            highR: 255,
            highG: 255,
            highB: 255
        });

        this.sampleCount = 0;
        this.samples = {};
        this.sampleNames = [];

        log("AneuTrack: config: " + JSON.stringify(config));
        this.config = config;

    };

    igv.AneuTrack.prototype.popupMenuItems = function (popover) {

        var myself = this;

        return [];

    };

    igv.AneuTrack.prototype.getSummary = function (chr, bpStart, bpEnd, continuation, task) {
        var me = this;
        var filtersummary = function (redlinedata) {
            var summarydata = [];
            //log("AneuTrack: getSummary for: " + JSON.stringify(me.featureSourceRed.url));
            for (i = 0, len = redlinedata.length; i < len; i++) {
                var feature = redlinedata[i];
                if (Math.abs(feature.score - 2) > 0.5 && (feature.end - feature.start > 5000000)) {
                    //log("adding summary: "+JSON.stringify(feature));
                    summarydata.push(feature);
                }
            }
            continuation(summarydata);
        };
        if (this.featureSourceRed) {
            this.featureSourceRed.getFeatures(chr, bpStart, bpEnd, filtersummary, task);
        }
        else {
            log("Aneu track has no summary data yet");
            continuation(null);
        }
    };
    igv.AneuTrack.prototype.loadSummary = function (chr, bpStart, bpEnd, continuation, task) {
        var me = this;
        if (this.featureSourceRed) {
            this.featureSourceRed.getFeatures(chr, bpStart, bpEnd, continuation, task);
        }
        else {
            //log("Data is not loaded yet. Loading json first. tokens are "+me.config.tokens);

            var afterJsonLoaded = function (json) {
                if (json) {
                    json = JSON.parse(json);
//        		log("Got json: " + JSON.stringify(json));
                    me.featureSourceRed = new igv.AneuFeatureSource(config, json.redline);
                    me.getSummary(chr, bpStart, bpEnd, continuation, task);
                }
                else {
                    //log("afterJsonLoaded: got no json result for "+config.url);
                }
            };

            afterload = {
                headers: me.config.headers, // http headers, not file header
                tokens: me.config.tokens, // http headers, not file header
                success: afterJsonLoaded
            };
            var config = me.config;
            if (config.localFile) {
                igvxhr.loadStringFromFile(config.localFile, afterload);
            } else {
                igvxhr.loadString(config.url, afterload);
            }
            return null;
        }
    };

    igv.AneuTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {
        var me = this;
        if (this.featureSourceRed) {
            // first load diff file, then load redline file, THEN call
            // continuation
            var loadsecondfile = function (redlinedata) {
                // console.log("loadsecondfile: argument redlinedata:
                // "+JSON.stringify(redlinedata));
                me.redlinedata = redlinedata;
                // console.log("Now loading diff data, using original
                // continuation");
                me.featureSource.getFeatures(chr, bpStart, bpEnd, continuation, task);
            };
            // console.log("About to load redline file");
            this.featureSourceRed.getFeatures(chr, bpStart, bpEnd, loadsecondfile, task);

        } else {
            log("Data is not loaded yet. Loading json first");

            var afterJsonLoaded = function (json) {
                json = JSON.parse(json);
                log("Got json: " + json + ", diff :" + json.diff);
                me.featureSource = new igv.AneuFeatureSource(config, json.diff);
                me.featureSourceRed = new igv.AneuFeatureSource(config, json.redline);
                me.getFeatures(chr, bpStart, bpEnd, continuation, task);
            };

            afterload = {
                headers: me.config.headers, // http headers, not file header
                tokens: me.config.tokens, // http headers, not file header
                success: afterJsonLoaded
            };
            var config = me.config;
            if (config.localFile) {
                igvxhr.loadStringFromFile(config.localFile, afterload);
            } else {
                igvxhr.loadString(config.url, afterload);
            }
        }
    };
    igv.AneuTrack.prototype.getColor = function (value) {
        var expected = 2;
        if (value < expected) {
            color = this.lowColor;
        } else if (value > expected) {
            color = this.highColor;
        }
        else color = this.midColor;
        return color;
    };
    igv.AneuTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

        var track = this,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight;

        var font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"
        };

        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        function computeH(min, max, value, maxpixels) {
            return maxpixels - Math.round((value - min) / max * maxpixels);
        }

        var max = track.max;
        if (!max) max = 8;
        var min = 0;
        var x = 49;

        igv.graphics.strokeLine(ctx, x, computeH(min, max, 0, track.maxheight), x, computeH(min, max, max, track.maxheight), font); // Offset

        x = x - 5;
        for (var p = 0; p <= max; p += 1) {
            var h = computeH(min, max, p, track.maxheight);
            igv.graphics.strokeLine(ctx, x, h, x + 5, h, font); // Offset dashes up by 2							// pixel
            if (p > 0 && p < max) igv.graphics.fillText(ctx, p, x - 4, h + 3, font); // Offset
        }

        font['textAlign'] = 'center';
        igv.graphics.fillText(ctx, "ploidy", x - 15, pixelHeight / 2, font, {rotate: {angle: -90}});


    };

    igv.AneuTrack.prototype.draw = function (options) {

        var myself = this,
            ctx,
            bpPerPixel,
            bpStart,
            pixelWidth,
            pixelHeight,
            bpEnd,
            segment,
            len,
            sample,
            i,
            y,
            color,
            value,
            px,
            px1,
            pw,
            xScale;

        ctx = options.context;
        pixelWidth = options.pixelWidth;
        pixelHeight = options.pixelHeight;
//	
        var max = 4;
        var min = 0;

        var PLOIDYMAX = 10;
        // deubugging
        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        var track = this;
        window.track = track;
        var computeMinMax = function (featureList) {
            for (i = 0, len = featureList.length; i < len; i++) {
                sample = featureList[i].sample;
                var value = featureList[i].value;
                if (value > max) max = value;
                if (value < min) min = value;
            }
            if (max > PLOIDYMAX) max = PLOIDYMAX;
            min = Math.max(min, 0);
            track.max = max;
        };
        var drawFeatureList = function (ctx, featureList, debug) {
            bpPerPixel = options.bpPerPixel;
            bpStart = options.bpStart;
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
            xScale = bpPerPixel;

            for (i = 0, len = featureList.length; i < len; i++) {
                sample = featureList[i].sample;
                if (sample && this.samples && this.samples.hasOwnProperty(sample)) {
                    this.samples[sample] = myself.sampleCount;
                    this.sampleNames.push(sample);
                    this.sampleCount++;
                }
            }

            checkForLog(featureList);
            var expected = 2;
            if (myself.isLog) {
                min = 0;
                expected = 0;
            }
            var maxheight = myself.height - 4;
            myself.maxheight = maxheight;


            var len = featureList.length;
            //  log("AneuTrack: Drawing "+len+" features between "+bpStart+"-"+bpEnd+", maxheight="+maxheight);
            // console.log("AneuTrack: Drawing: min ="+min+", max="+max);

            for (i = 0; i < len; i++) {


                segment = featureList[i];
                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                if (segment.sample) {
                    y = myself.samples[segment.sample] * myself.sampleHeight;
                    log("Got sample y=" + y);
                } else y = 0;

                value = segment.score;
                color = myself.midColor;
                if (myself.isLog) {
                    value = Math.log2(value / 2);
                    if (value < expected - 0.1) {
                        color = myself.negColorScale.getColor(value);
                    } else if (value > expected + 0.1) {
                        color = myself.posColorScale.getColor(value);
                    }
                } else {
                    if (value < expected - 0.2) {
                        color = myself.lowColor;
                    } else if (value > expected + 0.2) {
                        color = myself.highColor;
                    }
                }

                //debug = i < 5 && value == 0;
                //if (debug == true) log("Feature: " + JSON.stringify(segment));

                px = Math.round((segment.start - bpStart) / xScale);
                px1 = Math.round((segment.end - bpStart) / xScale);
                pw = Math.max(2, px1 - px);

                // the value determines the height
                if (value <= max) {
                    var h = computeH(min, max, value, maxheight);
                    if (debug == true)
                        log("       Got value " + value + ", h=" + h + ", y+h=" + (y + h) + ", px=" + px
                        + ", px1=" + px1 + ", pw=" + pw + ", color=" + color + ", maxh=" + maxheight);
                    // use different plot types
                    igv.graphics.fillRect(ctx, px, y + h, pw, 2, {
                        fillStyle: color
                    });
                }
                //else log("Value is too large: "+value);

            }
        };
        var maxheight = myself.height - 4;
        var font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': 'rgb(150,150,150)',
            'fillStyle': 'rgb(150,150,150)'
        };
        if (options.features) {
            computeMinMax(options.features);
        }
        if (this.redlinedata) {
            // console.log("Drawing redline data on top");
            computeMinMax(this.redlinedata);
        }
        //log("Got min/max: "+min+"-"+max);
        if (min < 2 && 2 < max) {

            var mid = computeH(min, max, 2.0, maxheight);
            console.log("drawing dashed line and solid line at " + mid + " to " + pixelWidth);
            igv.graphics.dashedLine(ctx, 20, mid, pixelWidth, mid, 4, font);
            var zero = computeH(min, max, 0, maxheight);
            igv.graphics.strokeLine(ctx, 20, zero, pixelWidth, zero, font);
        }
        else log("NOT drawing line at 2");
        if (options.features) {

            // console.log("Drawing diff data first");
            drawFeatureList(ctx, options.features, false);
        } else {
            console.log("No diff feature list. options=" + JSON.stringify(options));
        }
        if (this.redlinedata) {
            // console.log("Drawing redline data on top");
            drawFeatureList(ctx, this.redlinedata, false);
        } else {
            console.log("No redline feature list");
        }
        // draw axis is in paitnControl

        function computeH(min, max, value, maxpixels) {
            // console.log("comptuteH. min/max="+min+"/"+max+",
            // maxpixels="+maxpixels);
            return maxpixels - Math.round((value - min) / max * maxpixels);
        }

        function checkForLog(featureList) {
            var i;
            if (myself.isLog === undefined) {
                myself.isLog = false;
                for (i = 0; i < featureList.length; i++) {
                    if (featureList[i].value < 0) {
                        myself.isLog = true;
                        return;
                    }
                }
            }
        }
    };

    /**
     * Optional method to compute pixel height to accomodate the list of
     * features. The implementation below has side effects (modifiying the
     * samples hash). This is unfortunate, but harmless.
     *
     * @param features
     * @returns {number}
     */
    igv.AneuTrack.prototype.computePixelHeight = function (features) {
        // console.log("computePixelHeight");
        for (i = 0, len = features.length; i < len; i++) {
            sample = features[i].sample;
            if (this.samples && !this.samples.hasOwnProperty(sample)) {
                this.samples[sample] = this.sampleCount;
                this.sampleNames.push(sample);
                this.sampleCount++;
            }
        }
        this.sampleCount = Math.max(1, this.sampleCount);
        var h = Math.max(30, this.sampleCount * this.sampleHeight);
        this.height = h;
//	console.log("Computed height for " + features.length + " features, samplecount " + this.sampleCount
//		+ " and height " + this.sampleHeight + ": " + h);
        return h;
    };

    /**
     * Sort samples by the average value over the genomic range in the direction
     * indicated (1 = ascending, -1 descending)
     */
    igv.AneuTrack.prototype.sortSamples = function (chr, bpStart, bpEnd, direction, callback) {

        var myself = this, segment, min, max, f, i, s, sampleNames, len = bpEnd - bpStart, scores = {};

        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            // Compute weighted average score for each sample
            for (i = 0, len = featureList.length; i < len; i++) {

                segment = featureList[i];

                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                min = Math.max(bpStart, segment.start);
                max = Math.min(bpEnd, segment.end);
                f = (max - min) / len;

                s = scores[segment.sample];
                if (!s) s = 0;
                scores[segment.sample] = s + f * segment.value;

            }

            // Now sort sample names by score
            sampleNames = Object.keys(myself.samples);
            sampleNames.sort(function (a, b) {

                var s1 = scores[a];
                var s2 = scores[b];
                if (!s1) s1 = Number.MAX_VALUE;
                if (!s2) s2 = Number.MAX_VALUE;

                if (s1 == s2)
                    return 0;
                else if (s1 > s2)
                    return direction;
                else return direction * -1;

            });

            // Finally update sample hash
            for (i = 0; i < sampleNames.length; i++) {
                myself.samples[sampleNames[i]] = i;
            }
            myself.sampleNames = sampleNames;

            callback();

        });
    };

    /**
     * Handle an alt-click. TODO perhaps generalize this for all tracks
     * (optional).
     *
     * @param genomicLocation
     * @param event
     */
    igv.AneuTrack.prototype.altClick = function (genomicLocation, event) {

        // Define a region 5 "pixels" wide in genomic coordinates
        var refFrame = igv.browser.referenceFrame, bpWidth = refFrame.toBP(2.5), bpStart = genomicLocation - bpWidth, bpEnd = genomicLocation
            + bpWidth, chr = refFrame.chr, track = this;

        this.sortSamples(chr, bpStart, bpEnd, sortDirection, function () {
            track.trackView.update();
        });

        sortDirection *= -1;
    };

    igv.AneuTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        var sampleName, row = Math.floor(yOffset / this.sampleHeight), items;

        log("popupData for row " + row + ", sampleNames=" + JSON.stringify(this.sampleNames));
        if (row < this.sampleNames.length) {

            sampleName = this.sampleNames[row];

            if (sampleName) {
                items = [{
                    name: "Sample",
                    value: sampleName
                }];

            } else {
                items = [];
            }
            // We use the featureCache property rather than method to avoid
            // async load. If the
            // feature is not already loaded this won't work, but the user
            // wouldn't be mousing over it either.
            if (this.featureSource.featureCache) {
                var chr = igv.browser.referenceFrame.chr; // TODO -- this
                // should be passed
                // in
                var featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation, genomicLocation);
                featureList.forEach(function (f) {
                    if (f.sample === sampleName) {
                        items.push({
                            name: "Value",
                            value: f.value
                        });
                        items.push({
                            name: "Start",
                            value: f.start
                        });
                        items.push({
                            name: "End",
                            value: f.end
                        });
                    }
                });
            }
            if (this.featureSourceRed.featureCache) {
                var chr = igv.browser.referenceFrame.chr; // TODO -- this
                // should be passed
                // in
                var featureList = this.featureSourceRed.featureCache.queryFeatures(chr, genomicLocation,
                    genomicLocation);
                featureList.forEach(function (f) {
                    if (f.sample === sampleName) {
                        items.push({
                            name: "Value",
                            value: f.value
                        });
                        items.push({
                            name: "Start",
                            value: f.start
                        });
                        items.push({
                            name: "End",
                            value: f.end
                        });
                    }
                });
            }

            return items;
        }

        return null;
    }

    return igv;

})(igv || {});