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

    const MAX_GZIP_BLOCK_SIZE = (1 << 16);

    /**
     * Reader for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @constructor
     */
    igv.FeatureFileReader = function (config) {

        var self = this,
            uriParts;

        this.config = config || {};

        if (igv.isFilePath(this.config.url)) {
            this.filename = this.config.url.name;
        } else {
            uriParts = igv.parseUri(this.config.url);
            this.filename = uriParts.file;
            this.path = uriParts.path;
        }

        this.format = this.config.format;

        this.parser = getParser.call(this, this.format, this.config.decode);

        this.supportsWholeGenome = (this.format === "seg");  // TODO -- move this up to track level
    };


    function getParser(format, decode) {
        switch (format) {
            case "vcf":
                return new igv.VcfParser();
            case "seg" :
                return new igv.SegParser();
            default:
                return new igv.FeatureParser(format, decode, this.config);
        }

    }

    function isIndexable() {
        return this.config.indexURL || (this.type !== "wig" && this.type !== "seg" && this.config.indexed != false);
    }


    /**
     * Return a Promise for the async loaded index
     */
    function loadIndex() {
        var idxFile = this.config.indexURL;
        if (this.filename.endsWith(".gz")) {
            if (!idxFile) idxFile = this.config.url + ".tbi";
            return igv.loadBamIndex(idxFile, this.config, true);
        } else {
            if (!idxFile) idxFile = this.config.url + ".idx";
            return igv.loadTribbleIndex(idxFile, this.config);
        }
    }

    function loadFeaturesNoIndex() {

        var self = this;

        return new Promise(function (fullfill, reject) {
            var options = {
                headers: self.config.headers,           // http headers, not file header
                withCredentials: self.config.withCredentials
            };

            function parseData(data) {
                self.header = self.parser.parseHeader(data);
                if (self.header instanceof String && self.header.startsWith("##gff-version 3")) {
                    self.format = 'gff3';
                }
                fullfill(self.parser.parseFeatures(data));   // <= PARSING DONE HERE
            }

            igvxhr.loadString(self.config.url, options).then(parseData).catch(reject);

        });
    }


    function loadFeaturesWithIndex(chr, start, end) {

        //console.log("Using index");
        var self = this;

        return new Promise(function (fullfill, reject) {

            var blocks,
                tabix = self.index && self.index.tabix,
                refId = tabix ? self.index.sequenceIndexMap[chr] : chr,
                promises = [];

            blocks = self.index.blocksForRange(refId, start, end);

            if (!blocks || blocks.length === 0) {
                fullfill(null);       // TODO -- is this correct?  Should it return an empty array?
            }
            else {

                blocks.forEach(function (block) {

                    promises.push(new Promise(function (fullfill, reject) {

                        var startPos = block.minv.block,
                            startOffset = block.minv.offset,
                            endPos,
                            options,
                            success;

                        endPos = endPos = block.maxv.block + MAX_GZIP_BLOCK_SIZE;

                        options = {
                            headers: self.config.headers, // http headers, not file header
                            range: {start: startPos, size: endPos - startPos + 1},
                            withCredentials: self.config.withCredentials
                        };

                        success = function (data) {

                            var inflated,
                                slicedData;

                            if (self.index.tabix) {

                                inflated = igvxhr.arrayBufferToString(igv.unbgzf(data));
                                // need to decompress data
                            } else {
                                inflated = data;
                            }

                            slicedData = startOffset ? inflated.slice(startOffset) : inflated;
                            var f = self.parser.parseFeatures(slicedData);
                            fullfill(f);
                        };


                        // Async load
                        if (self.index.tabix) {
                            igvxhr.loadArrayBuffer(self.config.url, options).then(success).catch(reject);
                        } else {
                            igvxhr.loadString(self.config.url, options).then(success).catch(reject);
                        }

                    }))
                });

                Promise
                    .all(promises)
                    .then(function (featureArrays) {

                        var i,
                            allFeatures;

                        if (featureArrays.length === 1) {
                            allFeatures = featureArrays[0];
                        } else {
                            allFeatures = featureArrays[0];

                            for (i = 1; i < featureArrays.length; i++) {
                                allFeatures = allFeatures.concat(featureArrays[i]);
                            }

                            allFeatures.sort(function (a, b) {
                                return a.start - b.start;
                            });
                        }

                        fullfill(allFeatures)
                    })
                    .catch(reject);
            }
        });

    }


    function getIndex() {

        var self = this,
            isIndeedIndexible = isIndexable.call(this);
        return new Promise(function (fullfill, reject) {

            if (self.indexed === undefined && isIndeedIndexible) {
                loadIndex.call(self).then(function (index) {
                    if (index) {
                        self.index = index;
                        self.indexed = true;
                    }
                    else {
                        self.indexed = false;
                    }
                    fullfill(self.index);
                });
            }
            else {
                fullfill(self.index);   // Is either already loaded, or there isn't one
            }

        });
    }

    igv.FeatureFileReader.prototype.readHeader = function () {

        var self = this;

        return new Promise(function (fullfill, reject) {


            if (self.header) {
                fullfill(self.header);
            }

            else {

                // We force a load of the index first

                getIndex.call(self).then(function (index) {

                    var options,
                        success;

                    if (index) {

                        // Load the file header (not HTTP header) for an indexed file.
                        // TODO -- note this will fail if the file header is > 65kb in size
                        options = {
                            headers: self.config.headers,           // http headers, not file header
                            bgz: index.tabix,
                            range: {start: 0, size: 65000},
                            withCredentials: self.config.withCredentials
                        };

                        success = function (data) {
                            self.header = self.parser.parseHeader(data);
                            fullfill(self.header);
                        };

                        igvxhr.loadString(self.config.url, options).then(success).catch(reject);

                    } else {
                        loadFeaturesNoIndex
                            .call(self, undefined).then(function (features) {
                            var header = self.header || {};
                            header.features = features;
                            fullfill(header);
                        })
                            .catch(reject);
                    }
                });
            }
        });

    }

    /**
     *
     * @param fullfill
     * @param range -- genomic range to load.  For use with indexed source (optional)
     */
    igv.FeatureFileReader.prototype.readFeatures = function (chr, start, end) {

        var self = this;

        return new Promise(function (fullfill, reject) {

            if (self.index) {
                loadFeaturesWithIndex.call(self, chr, start, end).then(packFeatures).catch(reject);
            }
            else {
                loadFeaturesNoIndex.call(self).then(packFeatures).catch(reject);
            }

            function packFeatures(features) {
                // TODO pack
                fullfill(features);
            }

        });
    }





    return igv;
})
(igv || {});
