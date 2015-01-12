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
        this.sampleSquishHeight = config.sampleSquishHeight || 10;
        this.sampleExpandHeight = config.sampleExpandHeight || 30;

        this.sampleHeight = this.sampleExpandHeight;

        
        this.highColor = config.highColor || 'rgb(30,30,255)';
        this.lowColor = config.lowColor || 'rgb(220,0,0)';
        this.midColor = config.midColor || 'rgb(150,150,150)';
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
        
        console.log("AneuTrack: config: "+JSON.stringify(config));
        var me = this;
        this.config = config;
        
        
    };

    
    igv.AneuTrack.prototype.popupMenuItems = function (popover) {

        var myself = this;

        return [           
        ];

    };
    
    igv.AneuTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {
        var me = this;
        if (this.featureSourceRed) {
            // first load diff file, then load redline file, THEN call continuation
            var loadsecondfile = function(redlinedata) {
                //console.log("loadsecondfile: argument redlinedata: "+JSON.stringify(redlinedata));
                me.redlinedata = redlinedata;
                //console.log("Now loading diff data, using original continuation");
                me.featureSource.getFeatures(chr, bpStart, bpEnd, continuation, task);
            };
            //console.log("About to load redline file");
            this.featureSourceRed.getFeatures(chr, bpStart, bpEnd, loadsecondfile, task);
        
        }
        else {
           console.log("Data is not loaded yet. Loading json first");
           
           var afterJsonLoaded = function(json) {
                json = JSON.parse(json);               
                console.log("Got json: "+json+", diff :"+json.diff);
                me.featureSource = new igv.AneuFeatureSource(config, json.diff);            
                me.featureSourceRed = new igv.AneuFeatureSource(config, json.redline);
                me.getFeatures(chr, bpStart, bpEnd, continuation, task);
            };
           
            afterload = {
                        headers: me.config.headers,           // http headers, not file header
                        success: afterJsonLoaded                    
            };
            var config = me.config;
            if (config.localFile) {
                igvxhr.loadStringFromFile(config.localFile, afterload);
            }
            else {
                igvxhr.loadString(config.url, afterload);
            }   
            }
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

        //console.log("Draw called. redline="+this.redlindata);
            
        canvas = options.context;
        pixelWidth = options.pixelWidth;
        pixelHeight = options.pixelHeight;
        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        var max = -1000;
        var min = 10000;
        
        // deubugging
        window.track  = this;
        var drawFeatureList = function(featureList, debug) {
            bpPerPixel = options.bpPerPixel;
            bpStart = options.bpStart;
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
            xScale = bpPerPixel;
           
            for (i = 0, len = featureList.length; i < len; i++) {
                sample = featureList[i].sample;
                var value = featureList[i].value;
                if (value > max) max = value;
                if (value < min) min = value;
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
            var maxheight = myself.height;
            
            //console.log("AneuTrack: Drawing "+featureList.length+" features between "+bpStart+"-"+bpEnd+", maxheight="+maxheight);
            //console.log("AneuTrack: Drawing: min ="+min+", max="+max);
            for (i = 0, len = featureList.length; i < len; i++) {

                segment = featureList[i];
                if (debug == true) console.log("Feature: "+JSON.stringify(segment));
                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                if (segment.sample) {
                    y = myself.samples[segment.sample] * myself.sampleHeight;
                }
                else y = 0;

                value = segment.score;
                color = myself.midColor;
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
                pw = Math.max(2, px1 - px);                
                
               
                // the value determines the height
                var h = computeH(min, max, value, maxheight);
                if (debug == true)  console.log("       Got value "+value+", h="+h+", y+h+"+(y+h)+", px="+px+", px1="+px1+", pw="+pw+", color="+color);
                // use different plot types
                canvas.fillRect(px, y+h, pw, 2, {fillStyle: color});
                    
                
                
            }
        }
        if (options.features) {
        
            //  console.log("Drawing diff data first");
              drawFeatureList(options.features, false);              
        }
        else {
            console.log("No diff feature list. options="+JSON.stringify(options));
        }
        if (this.redlinedata) {
           // console.log("Drawing redline data on top");
            drawFeatureList(this.redlinedata, false);               
        }
        else {
            console.log("No redline feature list");
        }
        
        function computeH (min, max, value, maxpixels) {
            //console.log("comptuteH. min/max="+min+"/"+max+", maxpixels="+maxpixels);
            return maxpixels - Math.round((value - min)/max* maxpixels);
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
        console.log("Computed height for "+features.length+" features, samplecount "+this.sampleCount+" and height "+ this.sampleHeight+": "+h);
        return h;
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

            console.log("popupData for row "+row+", sampleNames="+JSON.stringify(this.sampleNames));
        if (row < this.sampleNames.length) {

            sampleName = this.sampleNames[row];

            if (sampleName) {
                items = [
                    {name: "Sample", value: sampleName}
                ];

            }
            else {
                items = [];
            }
            // We use the featureCache property rather than method to avoid async load.  If the
            // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
            if (this.featureSource.featureCache) {
                var chr = igv.browser.referenceFrame.chr;  // TODO -- this should be passed in
                var featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation, genomicLocation);
                featureList.forEach(function (f) {
                    if (f.sample === sampleName) {
                        items.push({name: "Value", value: f.value});
                        items.push({name: "Start", value: f.start});
                        items.push({name: "End", value: f.end});
                    }
                });
            }
            if (this.featureSourceRed.featureCache) {
                var chr = igv.browser.referenceFrame.chr;  // TODO -- this should be passed in
                var featureList = this.featureSourceRed.featureCache.queryFeatures(chr, genomicLocation, genomicLocation);
                featureList.forEach(function (f) {
                    if (f.sample === sampleName) {
                        items.push({name: "Value", value: f.value});
                        items.push({name: "Start", value: f.start});
                        items.push({name: "End", value: f.end});
                    }
                });
            }

            return items;
        }

        return null;
    }

    return igv;

})(igv || {});