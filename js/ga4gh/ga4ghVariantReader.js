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

var igv = (function (igv) {


    igv.Ga4ghVariantReader = function (config) {

        this.config = config;
        this.url = config.url;
        this.variantSetId = config.variantSetId;
        this.callSetIds = config.callSetIds;

    }


    igv.Ga4ghVariantReader.prototype.readFeatures = function (chr, bpStart, bpEnd, success, task) {

        var myself = this;

        getChrNameMap(function (chrNameMap) {

            var queryChr = chrNameMap.hasOwnProperty(chr) ? chrNameMap[chr] : chr,
                readURL = myself.url + "/variants/search";

            igv.ga4ghSearch({
                url: readURL,
                body: {
                    "variantSetIds": [myself.variantSetId],
                    "callSetIds": myself.callSetIds,            // Empty for now, we don't use genotypes yet
                    "referenceName": queryChr,
                    "start": bpStart.toString(),
                    "end": bpEnd.toString(),
                    "pageSize": "10000"
                },
                decode: function (json) {
                    var variants = [];

                    // If a single call set id is specified filter out hom-ref calls
                    //var filterHomeRef = myself.callSetIds && myself.callSetIds.length == 1;

                    json.variants.forEach(function (json) {
                        if (json.calls && json.calls.length === 1) {
                            var allele1 = json.calls[0].genotype[0],
                                allele2 = json.calls[0].genotype[1],
                                variant;
                            if (allele1 === 0 && allele2 === 0) {
                                return //gt = "HOMEREF"
                            }
                            else if (allele1 === allele2) {
                                gt = "HOMVAR"
                            }
                            else {
                                gt = "HETVAR";
                            }
                            variant = igv.createGAVariant(json);
                            variant.genotype = gt;
                            variants.push(variant);
                        }
                        else {
                            variants.push(igv.createGAVariant(json));
                        }
                    });

                    return variants;
                },
                success: success,
                task: task
            });
        });


        function getChrNameMap(continuation) {

            if (myself.chrNameMap) {
                continuation(myself.chrNameMap);
            }

            else {
                myself.readMetadata(function (json) {

                    myself.metadata = json.metadata;
                    myself.chrNameMap = {};
                    if (json.referenceBounds && igv.browser) {
                        json.referenceBounds.forEach(function (rb) {
                            var refName = rb.referenceName,
                                alias = igv.browser.genome.getChromosomeName(refName);
                            myself.chrNameMap[alias] = refName;

                        });
                    }
                    continuation(myself.chrNameMap);

                })
            }

        }

    }


    igv.Ga4ghVariantReader.prototype.readMetadata = function (success, task) {


        igv.ga4ghGet({
            url: this.url,
            entity: "variantsets",
            entityId: this.variantSetId,
            success: success,
            task: task
        })

    }

    return igv;

})(igv || {});