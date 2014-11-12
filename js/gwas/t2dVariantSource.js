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

// Experimental class for fetching features from an mpg webservice.

var igv = (function (igv) {


    const VARIANT = "VARIANT";
    const TRAIT = "TRAIT";
    /**
     * @param url - url to the webservice
     * @constructor
     */
    igv.T2DVariantSource = function (config) {

    	this.config = config;
        this.proxy = (config.proxy ? config.proxy : "//www.broadinstitute.org/igvdata/t2d/postJson.php");   // Always use a proxy for now
        this.url = config.url;
        this.trait = config.trait;
        this.valueThreshold = config.valueThreshold ? config.valueThreshold : 5E-2;

        this.type = this.url.contains("variant") ? VARIANT : TRAIT;
        this.pvalue = config.pvalue ? config.pvalue : "PVALUE";

    };

    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the success function.  Usually this is
     * a function that renders the features on the canvas
     *
     * @param queryChr
     * @param bpStart
     * @param bpEnd
     * @param success -- function that takes an array of features as an argument
     */
    igv.T2DVariantSource.prototype.getFeatures = function (chr, bpStart, bpEnd, success, task) {

        var source = this;

        if (this.cache && this.cache.chr === chr && this.cache.end > bpEnd && this.cache.start < bpStart) {
            success(this.cache.featuresBetween(bpStart, bpEnd));
        }

        else {

            function loadFeatures() {

                // Get a minimum 10mb window around the requested locus
                var window = Math.max(bpEnd - bpStart, 10000000) / 2,
                    center = (bpEnd + bpStart) / 2,
                    queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr),
                    queryStart = Math.max(0, center - window),
                    queryEnd = center + window,
                    queryURL = this.proxy ? this.proxy : this.url,
                    filters =
                        [
                            {"operand": "CHROM", "operator": "EQ", "value": queryChr, "filter_type": "STRING" },
                            {"operand": "POS", "operator": "GT", "value": queryStart, "filter_type": "FLOAT" },
                            {"operand": "POS", "operator": "LT", "value": queryEnd, "filter_type": "FLOAT" },
                            {"operand": source.pvalue, "operator": "LTE", "value": source.valueThreshold, "filter_type": "FLOAT"}
                        ],
                    columns = source.type === TRAIT ?
                        ["CHROM", "POS", "DBSNP_ID", "PVALUE", "ZSCORE"] :
                        ["CHROM", "POS", source.pvalue, "DBSNP_ID"],
                    data = {
                        "user_group": "ui",
                        "filters": filters,
                        "columns": columns
                    },
                    tmp;


                if (source.type === TRAIT) data.trait = source.trait;

                tmp = this.proxy ?
                    "url=" + this.url + "&data=" + JSON.stringify(data) :
                    JSON.stringify(data);

                var options = {
                        sendData: tmp,
                        task: task,
                        success: function (json) {
                            var variants;

                            if (json) {
                                variants = json.variants;
                                variants.sort(function (a, b) {
                                    return a.POS - b.POS;
                                });
                                source.cache = new FeatureCache(chr, queryStart, queryEnd, variants);

                                success(variants);
                            }
                            else {
                                success(null);
                            }

                        }
                };
                options.config = myself.config;
                
                igvxhr.loadJson(queryURL, options);

            }

            loadFeatures.call(this);
        }
    }


    // Experimental linear index feature cache.
    var FeatureCache = function (chr, start, end, features) {

        var i, bin, lastBin;

        this.chr = chr;
        this.start = start;
        this.end = end;
        this.binSize = (end - start) / 100;
        this.binIndeces = [0];
        this.features = features;

        lastBin = 0;
        for (i = 0; i < features.length; i++) {
            bin = Math.max(0, Math.floor((features[i].POS - this.start) / this.binSize));
            if (bin > lastBin) {
                this.binIndeces.push(i);
                lastBin = bin;
            }
        }
    }

    FeatureCache.prototype.featuresBetween = function (start, end) {


        var startBin = Math.max(0, Math.min(Math.floor((start - this.start) / this.binSize) - 1, this.binIndeces.length - 1)),
            endBin = Math.max(0, Math.min(Math.floor((end - this.start) / this.binSize), this.binIndeces.length - 1)),
            startIdx = this.binIndeces[startBin],
            endIdx = this.binIndeces[endBin];

        return this.features; //.slice(startIdx, endIdx);

    }


    return igv;
})(igv || {});
