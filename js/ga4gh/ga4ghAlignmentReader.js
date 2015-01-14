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


    igv.Ga4ghAlignmentReader = function (config) {

        this.config = config;
        this.url = config.url;
        this.readGroupSetIds = config.readGroupSetIds;
        this.authKey = config.authKey || 'AIzaSyC-dujgw4P1QvNd8i_c-I-S_P1uxVZzn0w';  // Default only works for localhost & broadinstitute.org
    }


    igv.Ga4ghAlignmentReader.prototype.readFeatures = function (chr, bpStart, bpEnd, success, task) {

        var self = this;

        getChrNameMap(function (chrNameMap) {

            var queryChr = chrNameMap.hasOwnProperty(chr) ? chrNameMap[chr] : chr,
                readURL = self.url + "/reads/search",
                body = {
                    "readGroupSetIds": [self.readGroupSetIds],
                    "referenceName": queryChr,
                    "start": bpStart,
                    "end": bpEnd,
                    "pageSize": "10000"
                },
                decode = igv.decodeGa4ghReads;

            if (self.authKey) {
                readURL = readURL + "?key=" + self.authKey;
            }


            igv.ga4ghSearch(readURL, body, decode, success, task);

        });

        function getChrNameMap(continuation) {

            if (self.chrNameMap) {
                continuation(self.chrNameMap);
            }

            else {
                self.readMetadata(function (json) {

                    var readURL = self.url + "/references/search",
                        body = {
                            "referenceSetId": json.referenceSetId
                        }

                    if (self.authKey) {
                        readURL = readURL + "?key=" + self.authKey;
                    }

                    self.metadata = json.metadata;
                    self.chrNameMap = {};

                    igv.ga4ghSearch(readURL, body,
                        function (j) {
                            return j.references;
                        },
                        function (references) {

                            references.forEach(function (ref) {
                                var refName = ref.name,
                                    alias = igv.browser.genome.getChromosomeName(refName);
                                self.chrNameMap[alias] = refName;
                            });
                            continuation(self.chrNameMap);

                        }, task);
                });
            }

        }

    }


    igv.Ga4ghAlignmentReader.prototype.readMetadata = function (success, task) {

        var self = this;

        igv.ga4ghGet({
            url: this.url,
            entity: "readgroupsets",
            entityId: this.readGroupSetIds,
            authKey: this.authKey,
            success: function (json) {

                var readURL = self.url + "/references/search",
                    body = {
                        "referenceSetId": json.referenceSetId
                    }

                if (self.authKey) {
                    readURL = readURL + "?key=" + self.authKey;
                }

                igv.ga4ghSearch(readURL, body,
                    function (j) {
                        return j.references;
                    },
                    function (references) {
                        var refNames = [];
                        references.forEach(function (ref) {

                            refNames.push(ref.name);
                        });
                        success(json);
                    }, task);

            },
            task: task
        });
    }


    return igv;

})(igv || {});