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
        this.url = config.url;
        this.trait = config.trait;
        this.dataset = config.dataset;
        this.pvalue = config.pvalue;

        // Hack for old service that is missing CORS headers
        if (config.dataset === undefined && config.proxy === undefined) {
            config.proxy = "//data.broadinstitute.org/igvdata/t2d/postJson.php";
        }

        if (config.valueThreshold === undefined) {
            config.valueThreshold = 5E-2;
        }

        if (config.dataset === undefined) {
            this.queryJson = config.queryJson || queryJsonV1;
            this.jsonToVariants = config.jsonToVariants || jsonToVariantsV1;
        } else {
            this.queryJson = config.queryJson || queryJsonV2;
            this.jsonToVariants = config.jsonToVariants || jsonToVariantsV2;
        }

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

        var self = this;

        if (this.cache && this.cache.chr === chr && this.cache.end > bpEnd && this.cache.start < bpStart) {
            success(this.cache.featuresBetween(bpStart, bpEnd));
        }

        else {

            // Get a minimum 10mb window around the requested locus
            var window = Math.max(bpEnd - bpStart, 10000000) / 2,
                center = (bpEnd + bpStart) / 2,
                queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr), // Webservice uses "1,2,3..." convention
                queryStart = Math.max(0, center - window),
                queryEnd = center + window,
                queryURL = this.config.proxy ? this.config.proxy : this.url,
                body = this.queryJson(queryChr, queryStart, queryEnd, self.config);

            igvxhr.loadJson(queryURL, {
                sendData: body,
                task: task,
                success: function (json) {
                    var variants;

                    if (json) {

                        if (json.error_code) {
                            alert("Error querying trait " + self.trait + "  (error_code=" + json.error_code + ")");
                            success(null);
                        }
                        else {
                            variants = self.jsonToVariants(json, self.config);

                            variants.sort(function (a, b) {
                                return a.POS - b.POS;
                            });

                            // TODO -- extract pvalue

                            self.cache = new FeatureCache(chr, queryStart, queryEnd, variants);

                            success(variants);
                        }
                    }
                    else {
                        success(null);
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


    //
    //
    /**
     * Default json -> variant converter function.  Can be overriden.
     * Convert webservice json to an array of variants
     *
     * @param json
     * @param config
     * @returns {Array|*}
     */
    function jsonToVariantsV2(json, config) {

        variants = [];
        json.variants.forEach(function (record) {

            var variant = {};
            record.forEach(function (object) {
                for (var property in object) {
                    if (object.hasOwnProperty(property)) {
                        if ("POS" === property) {
                            variant.start = object[property] - 1;
                        }
                        variant[property] = object[property];

                    }
                }

            });

            // "unwind" the pvalue, then null the nested array to save memory
            variant.pvalue = variant[config.pvalue][config.dataset][config.trait];
            variant[config.pvalue] = undefined;

            variants.push(variant);
        })
        return variants;
    }


    function queryJsonV2(queryChr, queryStart, queryEnd, config) {
        var phenotype = config.trait,
            pvalue = config.pvalue,
            dataset = config.dataset,
            properties = {
                "cproperty": ["VAR_ID", "DBSNP_ID", "CHROM", "POS"],
                "orderBy": ["CHROM"],
                "dproperty": {},
                "pproperty": JSON.parse('{"' + pvalue + '": {"' + dataset + '": ["' + phenotype + '"]}}')
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
                        "value": queryStart,
                        "operand_type": "INTEGER"
                    },
                    {
                        "dataset_id": "x",
                        "phenotype": "x",
                        "operand": "POS",
                        "operator": "LTE",
                        "value": queryEnd,
                        "operand_type": "INTEGER"
                    },
                    {
                        "dataset_id": dataset,
                        "phenotype": phenotype,
                        "operand": pvalue,
                        "operator": "LT",
                        "value": config.valueThreshold,
                        "operand_type": "FLOAT"
                    }
                ],
            data = {
                "passback": "x",
                "entity": "variant",
                "properties": properties,
                "filters": filters
            };

        return JSON.stringify(data);
    }


    function queryJsonV1(queryChr, queryStart, queryEnd, config) {

        var type = config.url.contains("variant") ? VARIANT : TRAIT,
            pvalue = config.pvalue ? config.pvalue : "PVALUE",

            filters =
                [
                    {"operand": "CHROM", "operator": "EQ", "value": queryChr, "filter_type": "STRING"},
                    {"operand": "POS", "operator": "GT", "value": queryStart, "filter_type": "FLOAT"},
                    {"operand": "POS", "operator": "LT", "value": queryEnd, "filter_type": "FLOAT"},
                    {"operand": pvalue, "operator": "LTE", "value": config.valueThreshold, "filter_type": "FLOAT"}
                ],
            columns = type === TRAIT ?
                ["CHROM", "POS", "DBSNP_ID", "PVALUE", "ZSCORE"] :
                ["CHROM", "POS", pvalue, "DBSNP_ID"],
            data = {
                "user_group": "ui",
                "filters": filters,
                "columns": columns
            };


        if (type === TRAIT) data.trait = config.trait;

        return config.proxy ? "url=" + config.url + "&data=" + JSON.stringify(data) : JSON.stringify(data);

    }

    function jsonToVariantsV1(json, config) {

        json.variants.forEach(function (variant) {
            variant.chr = variant.CHROM;
            variant.start = variant.POS - 1;
        })
        return json.variants;
    }


    return igv;
})(igv || {});

