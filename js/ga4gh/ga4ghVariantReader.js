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


    igv.Ga4ghVariantReader = function (config, genome) {

        this.config = config;
        this.genome = genome;
        this.url = config.url;
        this.variantSetId = config.variantSetId;
        this.callSetIds = config.callSetIds;
        this.includeCalls = (config.includeCalls === undefined ? true : config.includeCalls);

    }

    // Simulate a VCF file header
    igv.Ga4ghVariantReader.prototype.readHeader = function () {

        var self = this;


        if (self.header) {
            return Promise.resolve(self.header);
        }

        else {

            self.header = {};

            if (self.includeCalls === false) {
                return Promise.resolve(self.header);
            }
            else {

                var readURL = self.url + "/callsets/search";

                return igv.ga4ghSearch({
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
                                csIdSet.add(csid);
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
                })
                    .then(function (callSets) {
                        self.header.callSets = callSets;
                        return self.header;
                    })
            }
        }
    }


    igv.Ga4ghVariantReader.prototype.readFeatures = function (chr, bpStart, bpEnd) {

        const self = this;
        const genome = this.genome;

        return self.readHeader()

            .then(function (header) {
                return getChrAliasTable()
            })

            .then(function (chrAliasTable) {

                var queryChr = chrAliasTable.hasOwnProperty(chr) ? chrAliasTable[chr] : chr,
                    readURL = self.url + "/variants/search";

                return igv.ga4ghSearch({
                    url: readURL,
                    fields: (self.includeCalls ? undefined : "nextPageToken,variants(id,variantSetId,names,referenceName,start,end,referenceBases,alternateBases,quality,filter,info)"),
                    body: {
                        "variantSetIds": (Array.isArray(self.variantSetId) ? self.variantSetId : [self.variantSetId]),
                        "callSetIds": (self.callSetIds ? self.callSetIds : undefined),
                        "referenceName": queryChr,
                        "start": bpStart.toString(),
                        "end": bpEnd.toString(),
                        "pageSize": "10000"
                    },
                    decode: function (json) {

                        var v;

                        var variants = [];

                        json.variants.forEach(function (json) {

                            v = igv.createGAVariant(json);

                            if (!v.isRefBlock()) {
                                variants.push(v);
                            }
                        });

                        return variants;
                    }
                })
            })


        function getChrAliasTable() {

            return new Promise(function (fulfill, reject) {

                if (self.chrAliasTable) {
                    fulfill(self.chrAliasTable);
                }

                else {
                    self.readMetadata().then(function (json) {

                        self.metadata = json.metadata;
                        self.chrAliasTable = {};

                        if (json.referenceBounds && genome) {

                            json.referenceBounds.forEach(function (rb) {
                                var refName = rb.referenceName,
                                    alias = genome.getChromosomeName(refName);
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
