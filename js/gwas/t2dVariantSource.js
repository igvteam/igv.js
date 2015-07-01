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

        if (config.url.startsWith("http://dig-dev.broadinstitute.org:8888/") && config.proxy === undefined) {
            this.proxy = "//www.broadinstitute.org/igvdata/t2d/postJson.php";  // Hack for old service that is missing CORS headers
        }

        this.url = config.url;
        this.trait = config.trait;
        this.dataset = config.dataset;
        this.pvalue = config.pvalue;
        this.valueThreshold = config.valueThreshold ? config.valueThreshold : 5E-2;

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

            if (this.dataset === undefined) {
                loadFeaturesV1.call(this);
            } else {
                loadFeaturesV2.call(this);
            }
        }


        function loadFeaturesV1() {

            // Get a minimum 10mb window around the requested locus
            var window = Math.max(bpEnd - bpStart, 10000000) / 2,
                center = (bpEnd + bpStart) / 2,
                queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr), // Webservice uses "1,2,3..." convention
                queryStart = Math.max(0, center - window),
                queryEnd = center + window,
                queryURL = this.proxy ? this.proxy : this.url,
                type = this.url.contains("variant") ? VARIANT : TRAIT,
                pvalue = this.config.pvalue ? this.config.pvalue : "PVALUE",

                filters =
                    [
                        {"operand": "CHROM", "operator": "EQ", "value": queryChr, "filter_type": "STRING"},
                        {"operand": "POS", "operator": "GT", "value": queryStart, "filter_type": "FLOAT"},
                        {"operand": "POS", "operator": "LT", "value": queryEnd, "filter_type": "FLOAT"},
                        {"operand": pvalue, "operator": "LTE", "value": source.valueThreshold, "filter_type": "FLOAT"}
                    ],
                columns = type === TRAIT ?
                    ["CHROM", "POS", "DBSNP_ID", "PVALUE", "ZSCORE"] :
                    ["CHROM", "POS", pvalue, "DBSNP_ID"],
                data = {
                    "user_group": "ui",
                    "filters": filters,
                    "columns": columns
                },
                tmp;


            if (type === TRAIT) data.trait = source.trait;

            tmp = this.proxy ?
            "url=" + this.url + "&data=" + JSON.stringify(data) :
                JSON.stringify(data);

            igvxhr.loadJson(queryURL, {
                sendData: tmp,
                task: task,
                success: function (json) {
                    var variants;

                    if (json) {

                        if (json.error_code) {
                            alert("Error querying trait " + source.trait + "  (error_code=" + json.error_code + ")");
                            success(null);
                        }
                        else {
                            variants = json.variants;
                            variants.sort(function (a, b) {
                                return a.POS - b.POS;
                            });
                            source.cache = new FeatureCache(chr, queryStart, queryEnd, variants);

                            success(variants);
                        }
                    }
                    else {
                        success(null);
                    }

                }
            });

        }

        function loadFeaturesV2() {

            // Get a minimum 10mb window around the requested locus
            var window = Math.max(bpEnd - bpStart, 10000000) / 2,
                center = (bpEnd + bpStart) / 2,
                queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr), // Webservice uses "1,2,3..." convention
                queryStart = Math.max(0, center - window),
                queryEnd = center + window,
                queryURL = this.proxy ? this.proxy : this.url,
                phenotype = this.trait,
                pvalue = this.pvalue,
                dataset = this.dataset,
                pproperty = JSON.parse('{"' + pvalue + '": {"' + dataset + '": ["' + phenotype + '"]}}'),
                properties = {
                    "cproperty": ["VAR_ID", "DBSNP_ID", "CHROM", "POS"],
                    "orderBy": ["CHROM"],
                    "dproperty": {},
                    "pproperty": pproperty
                },

                filters =
                    [
                        {
                            "dataset_id": "x",
                            "phenotype": "x",
                            "operand": "CHROM",
                            "operator": "EQ",
                            "value": queryChr,
                            "operand_type": "STRING"
                        },
                        {
                            "dataset_id": "x",
                            "phenotype": "x",
                            "operand": "POS",
                            "operator": "GTE",
                            "value": bpStart,
                            "operand_type": "INTEGER"
                        },
                        {
                            "dataset_id": "x",
                            "phenotype": "x",
                            "operand": "POS",
                            "operator": "LTE",
                            "value": bpEnd,
                            "operand_type": "INTEGER"
                        },
                        {
                            "dataset_id": dataset,
                            "phenotype": phenotype,
                            "operand": pvalue,
                            "operator": "LT",
                            "value": this.valueThreshold,
                            "operand_type": "FLOAT"
                        }
                    ],
                data = {
                    "passback": "x",
                    "entity": "variant",
                    "properties": properties,
                    "filters": filters
                },
                tmp;

            console.log(JSON.stringify(data));

            if (source.type === TRAIT) data.trait = source.trait;

            tmp = this.proxy ?
            "url=" + this.url + "&data=" + JSON.stringify(data) :
                JSON.stringify(data);

            igvxhr.loadJson(queryURL, {
                sendData: tmp,
                task: task,
                success: function (json) {
                    var variants;

                    if (json) {

                        if (json.error_code) {
                            alert("Error querying trait " + source.trait + "  (error_code=" + json.error_code + ")");
                            success(null);
                        }
                        else {
                            variants = [];
                            json.variants.forEach(function (varArray) {
                                variants.push(convert(varArray));
                            })

                            variants.sort(function (a, b) {
                                return a.POS - b.POS;
                            });

                            // TODO -- extract pvalue

                            source.cache = new FeatureCache(chr, queryStart, queryEnd, variants);

                            success(variants);
                        }
                    }
                    else {
                        success(null);
                    }

                    // Convert a variant as returned by the webservice into an object
                    function convert(varArray) {
                        var variant = {};
                        varArray.forEach(function (object) {
                            for (var property in object) {
                                if (object.hasOwnProperty(property)) {
                                    variant[property] = object[property];
                                }
                            }

                        });

                        // "unwind" the pvalue, then null the nested array to save memory
                        variant.pvalue =  variant[pvalue][dataset][phenotype];
                        variant[pvalue] = undefined;
                        return variant;

                    }

                }
            });
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

