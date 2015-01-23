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
// http://immvar.broadinstitute.org:3000/load_data?chromosome=&start=&end=&categories=

var igv = (function (igv) {

    /**
     * @param url - url to the webservice
     * @constructor
     */
    igv.ImmVarReader = function (config) {

        this.url = config.url;
        this.cellConditionId = config.cellConditionId;
        this.valueThreshold = config.valueThreshold ? config.valueThreshold : 5E-2;

    };

    igv.ImmVarReader.prototype.readFeatures = function (success, task, range) {

        var queryChr = range.chr,
            queryStart = range.start,
            queryEnd = range.end,
            queryURL = this.url + "?chromosome=" + queryChr + "&start=" + queryStart + "&end=" + queryEnd +
                "&cell_condition_id=" + this.cellConditionId;


        igvxhr.loadJson(queryURL, {
            task: task,
            success: function (json) {
                var variants;

                if (json) {
                    //variants = json.variants;
                    //variants.sort(function (a, b) {
                    //    return a.POS - b.POS;
                    //});
                    //source.cache = new FeatureCache(chr, queryStart, queryEnd, variants);

                    json.eqtls.forEach(function (eqtl) {
                        eqtl.chr = eqtl.chromosome;
                        eqtl.start = eqtl.position;
                        eqtl.end = eqtl.position + 1;
                    });

                    success(json.eqtls);
                }
                else {
                    success(null);
                }

            }
        });

    }


    return igv;
})
(igv || {});
