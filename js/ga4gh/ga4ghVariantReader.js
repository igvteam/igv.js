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
        this.includeCalls = (config.includeCalls === undefined ? true : config.includeCalls);

    }

    // Simulate a VCF file header
    igv.Ga4ghVariantReader.prototype.readHeader = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {


            if (self.header) {
                fulfill(self.header);
            }

            else {

                self.header = {};

                if (self.includeCalls === false) {
                    fulfill(self.header);
                }
                else {

                    var readURL = self.url + "/callsets/search";

                    igv.ga4ghSearch({
                        url: readURL,
                        fields: "nextPageToken,callSets(id,name)",
                        body: {
                            "variantSetIds": (Array.isArray(self.variantSetId) ? self.variantSetId : [self.variantSetId]),
                            "pageSize": "10000"
                        },
                        decode: function (json) {
                            // If specific callSetIds are specified filter to those
                            if (self.callSetIds) {
                                var filteredCallSets = [],
                                    csIdSet = new Set();

                                self.callSetIds.forEach(function (csid) {
                                    csIdSet.add(m);
                                })
                                json.callSets.forEach(function (cs) {
                                    if (csIdSet.has(cs.id)) {
                                        filteredCallSets.push(cs);
                                    }
                                });
                                return filteredCallSets;
                            }
                            else {
                                return json.callSets;
                            }
                        }
                    }).then(function (callSets) {
                        self.header.callSets = callSets;
                        fulfill(self.header);
                    }).catch(reject);
                }
            }

        });

    }


    igv.Ga4ghVariantReader.prototype.readFeatures = function (chr, bpStart, bpEnd) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            self.readHeader().then(function (header) {

                getChrNameMap().then(function (chrNameMap) {

                    var queryChr = chrAliasTable.hasOwnProperty(chr) ? chrAliasTable[chr] : chr,
                        readURL = self.url + "/variants/search";

                    igv.ga4ghSearch({
                        url: readURL,
                        fields: (self.includeCalls ? undefined : "nextPageToken,variants(id,variantSetId,names,referenceName,start,end,referenceBases,alternateBases,quality, filter, info)"),
                        body: {
                            "variantSetIds": (Array.isArray(self.variantSetId) ? self.variantSetId : [self.variantSetId]),
                            "callSetIds": (self.callSetIds ? self.callSetIds : undefined),
                            "referenceName": queryChr,
                            "start": bpStart.toString(),
                            "end": bpEnd.toString(),
                            "pageSize": "10000"
                        },
                        decode: function (json) {
                            var variants = [];

                            json.variants.forEach(function (json) {
                                variants.push(igv.createGAVariant(json));
                            });

                            return variants;
                        }
                    }).then(fulfill).catch(reject);
                }).catch(reject);  // chr name map
            }).catch(reject);  // callsets
        });


        function getChrNameMap() {

            return new Promise(function (fulfill, reject) {

                if (self.chrAliasTable) {
                    fulfill(self.chrAliasTable);
                }

                else {
                    self.readMetadata().then(function (json) {

                        self.metadata = json.metadata;
                        self.chrAliasTable = {};
                        if (json.referenceBounds && igv.browser) {
                            json.referenceBounds.forEach(function (rb) {
                                var refName = rb.referenceName,
                                    alias = igv.browser.genome.getChromosomeName(refName);
                                self.chrAliasTable[alias] = refName;

                            });
                        }
                        fulfill(self.chrAliasTable);

                    })
                }

            });
        }

    }


    igv.Ga4ghVariantReader.prototype.readMetadata = function () {

        return igv.ga4ghGet({
            url: this.url,
            entity: "variantsets",
            entityId: this.variantSetId
        });
    }


    return igv;

})(igv || {});
