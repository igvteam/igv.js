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

    var sortDirection = 1;

    igv.AneuTrack = function (config) {

        igv.configTrack(this, config);

        this.maxHeight = config.maxHeight || 500;
        this.sampleSquishHeight = config.sampleSquishHeight || 2;
        this.sampleExpandHeight = config.sampleExpandHeight || 12;

        this.sampleHeight = this.sampleExpandHeight;

        
        this.highColor = config.highColor || 'rbg(0,0,200)';
        this.lowColor = config.lowColor || 'rgb(200,0,0)';
        this.posColorScale = config.posColorScale ||
            new igv.GradientColorScale(
                {
                    low: 0.1,
                    lowR: 255,
                    lowG: 255,
                    lowB: 255,
                    high: 1.5,
                    highR: 255,
                    highG: 0,
                    highB: 0
                }
            );
        this.negColorScale = config.negColorScale ||
            new igv.GradientColorScale(
                {
                    low: -1.5,
                    lowR: 0,
                    lowG: 0,
                    lowB: 255,
                    high: -0.1,
                    highR: 255,
                    highG: 255,
                    highB: 255
                }
            );

        this.sampleCount = 0;
        this.samples = {};
        this.sampleNames = [];
        
        // TODO: multiple feature sources? one for redline, one for diff file?
        // parse json file and create config for both
        var configred = config;
        var configdiff = config;
        // set file/url for red and diff file
        
        console.log("AneuTrack: config: "+JSON.stringify(config));
        
        var afterJsonLoaded = function(json) {
            console.log("Got json: "+json+", diff :"+json.diff);
            this.featureSource = new igv.AneuFeatureSource(config, json.diff);            
            this.featureSourceRed = new igv.AneuFeatureSource(config, json.redline);
        };
        var myself = this;
        afterload = {
                    headers: myself.config.headers,           // http headers, not file header
                    success: afterJsonLoaded                    
        };
        if (config.localFile) {
            igvxhr.loadStringFromFile(config.localFile, afterload);
        }
        else {
            igvxhr.loadString(config.url, afterload);
        }   
        
    };

    igv.AneuTrack.prototype.popupMenuItems = function (popover) {

        var myself = this;

        return [
            {
                label: (this.sampleExpandHeight === this.sampleHeight) ? "Squish sample height" : "Expand sample height",
                click: function () {
                    popover.hide();
                    myself.toggleSampleHeight();
                }
            }
        ];

    };

    igv.AneuTrack.prototype.toggleSampleHeight = function () {

        this.sampleHeight = (this.sampleExpandHeight === this.sampleHeight) ? this.sampleSquishHeight : this.sampleExpandHeight;
        this.trackView.update();
    };

    igv.AneuTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {
        var me = this;
        // first load diff file, then load redline file, THEN call continuation
        var loadsecondfile = function(redlinedata) {
            console.log("Got redlinedata: "+JSON.stringify(redlinedata));
            me.redlinedata = redlinedata;
            console.log("Now loading diff data");
            this.featureSource.getFeatures(chr, bpStart, bpEnd, continuation, task);
        }
        console.log("About to load redline file");
        this.featureSourceRed.getFeatures(chr, bpStart, bpEnd, loadsecondfile, task);
        
    };
    
    

    igv.AneuTrack.prototype.draw = function (options) {

        
        var myself = this,
            featureList,
            canvas,
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

        console.log("Draw called. redline="+this.redlindata);
            
        canvas = options.context;
        pixelWidth = options.pixelWidth;
        pixelHeight = options.pixelHeight;
        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        
        var drawFeatureList = function(featureList) {
            bpPerPixel = options.bpPerPixel;
            bpStart = options.bpStart;
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
            xScale = bpPerPixel;

           
           var max = -1000;
           var min = 10000;
            for (i = 0, len = featureList.length; i < len; i++) {
                sample = featureList[i].sample;
                var value = featureList[i].value;
                if (value > max) max = value;
                if (value < min) min = value;
                if (!this.samples.hasOwnProperty(sample)) {
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
            
            console.log("AneuTrack: Drawing "+featureList.length+" features between "+bpStart+"-"+bpEnd);
            for (i = 0, len = featureList.length; i < len; i++) {

                segment = featureList[i];
                console.log("   Feature: "+JSON.stringify(segment));
                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                y = myself.samples[segment.sample] * myself.sampleHeight;

                value = segment.value;
                color = 'gray';
                if (myself.isLog) {
                    value = Math.log2(value / 2);                                
                    if (value < expected-0.1) {
                        color = myself.negColorScale.getColor(value);
                    }
                    else if (value > expected+0.1) {
                        color = myself.posColorScale.getColor(value);
                    }
                }
                else {
                    if (value < expected-0.1) {
                        color = myself.lowColor;
                    }
                    else if (value > expected+0.1) {
                        color = myself.highColor;
                    }
                }
                
                
                px = Math.round((segment.start - bpStart) / xScale);
                px1 = Math.round((segment.end - bpStart) / xScale);
                pw = Math.max(1, px1 - px);                
                if (this.sampleExpandHeight === this.sampleHeight) {
                    // expanded
                    // the value determines the height
                    var h = computeH(min, max, value, myself.sampleHeight);
                    console.log("       Got value "+value+", expected="+expected+", color="+color+", h="+h);
                    // use different plot types
                    canvas.fillRect(px, y+h, pw, 2, {fillStyle: color});
                    
                }
                else {
                    canvas.fillRect(px, y, pw, this.sampleHeight, {fillStyle: color});
                }
            }
        }
        if (options.featureList) {
        
              console.log("Drawing diff data first");
              drawFeatureList(featureList);              
        }
        else {
            console.log("No diff feature list");
        }
        if (this.redlinedata) {
            console.log("Drawing redline data on top");
            drawFeatureList(this.redlinedata);               
        }
        else {
            console.log("No redline feature list");
        }
        
        function computeH (min, max, value, maxpixels) {
            console.log("comptuteH. min/max="+min+"-"+max+", height="+myself.sampleHeight);
            return Math.round((value - min)/max* maxpixels);
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
     * Optional method to compute pixel height to accomodate the list of features.  The implementation below
     * has side effects (modifiying the samples hash).  This is unfortunate, but harmless.
     *
     * @param features
     * @returns {number}
     */
    igv.AneuTrack.prototype.computePixelHeight = function (features) {
        for (i = 0, len = features.length; i < len; i++) {
            sample = features[i].sample;
            if (!this.samples.hasOwnProperty(sample)) {
                this.samples[sample] = this.sampleCount;
                this.sampleNames.push(sample);
                this.sampleCount++;
            }
        }
        var h = Math.max(30, this.sampleCount * this.sampleHeight);
        //console.log("Computed height for "+features.length+" features, samplecount "+this.sampleCount+" and height "+ this.sampleHeight+": "+h);
    };

    /**
     * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
     */
    igv.AneuTrack.prototype.sortSamples = function (chr, bpStart, bpEnd, direction, callback) {

        var myself = this,
            segment,
            min,
            max,
            f,
            i,
            s,
            sampleNames,
            len = bpEnd - bpStart,
            scores = { };

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

                if (s1 == s2) return 0;
                else if (s1 > s2) return direction;
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
     * Handle an alt-click.   TODO perhaps generalize this for all tracks (optional).
     *
     * @param genomicLocation
     * @param event
     */
    igv.AneuTrack.prototype.altClick = function (genomicLocation, event) {

        // Define a region 5 "pixels" wide in genomic coordinates
        var refFrame = igv.browser.referenceFrame,
            bpWidth = refFrame.toBP(2.5),
            bpStart = genomicLocation - bpWidth,
            bpEnd = genomicLocation + bpWidth,
            chr = refFrame.chr,
            track = this;

        this.sortSamples(chr, bpStart, bpEnd, sortDirection, function () {
            track.trackView.update();
        });

        sortDirection *= -1;
    };

    igv.AneuTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        var sampleName,
            row = Math.floor(yOffset / this.sampleHeight),
            items;

        if (row < this.sampleNames.length) {

            sampleName = this.sampleNames[row];

            items = [
                {name: "Sample", value: sampleName}
            ];

            // We use the featureCache property rather than method to avoid async load.  If the
            // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
            if (this.featureSource.featureCache) {
                p("Got cached diff data");
                var chr = igv.browser.referenceFrame.chr;  // TODO -- this should be passed in
                var featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation, genomicLocation);
                featureList.forEach(function (f) {
                    if (f.sample === sampleName) {
                        items.push({name: "Value", value: f.value});
                    }
                });
            }
            if (this.featureSourceRed.featureCache) {
                p("Got cached redline data too");
                var chr = igv.browser.referenceFrame.chr;  // TODO -- this should be passed in
                var featureList = this.featureSourceRed.featureCache.queryFeatures(chr, genomicLocation, genomicLocation);
                featureList.forEach(function (f) {
                    if (f.sample === sampleName) {
                        items.push({name: "Value", value: f.value});
                    }
                });
            }

            return items;
        }

        return null;
    }

    return igv;

})(igv || {});