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

        this.config = config || {};
        if (config.localFile) {
            this.localFile = config.localFile;
            this.filename = config.localFile.name;
        }
        else {
            this.url = config.url;
            this.filename = config.url;
            this.indexURL = config.indexURL;
            this.headURL = config.headURL || this.filename;
        }

        if (!config.format) {
            igv.inferTypes(config);
        }
        this.format = config.format;

        this.parser = getParser(this.format, config.decode);
    };


    function getParser(format, decode) {

        switch (format) {
            case "vcf":
                return new igv.VcfParser();
            case "seg" :
                return new igv.SegParser();
            default:
                return new igv.FeatureParser(format, decode);
        }

    }

    // seg files don't have an index
    function isIndexable() {
        var configIndexURL = this.config.indexURL,
            type = this.type,
            configIndexed = this.config.indexed;

        return configIndexURL || (type != "wig" && configIndexed != false);
    }


    /**
     * Return a Promise for the async loaded index
     */
    function loadIndex() {
        var idxFile = this.indexURL;
        if (this.url.endsWith(".gz")) {
            if (!idxFile) idxFile = this.url + ".tbi";
            return igv.loadBamIndex(idxFile, this.config, true);
        }
        else {
            if (!idxFile) idxFile = this.url + ".idx";
            return igv.loadTribbleIndex(idxFile, this.config);
        }
    }

    function loadFeaturesNoIndex(task, continuation) {

        var self = this;

        return new Promise(function (fulfill, reject) {
            parser = self.parser,
                options = {
                    headers: self.config.headers,           // http headers, not file header
                    withCredentials: self.config.withCredentials,
                    task: task
                };

            if (self.localFile) {
                igvxhr.loadStringFromFile(self.localFile, options).then(parseData);
            }
            else {
                igvxhr.loadString(self.url, options).then(parseData);
            }


            function parseData(data) {
                self.header = parser.parseHeader(data);
                fulfill(parser.parseFeatures(data));   // <= PARSING DONE HERE
            };
        });
    }


    function loadFeaturesWithIndex(chr, start, end, task) {

        //console.log("Using index");
        var self = this;

        return new Promise(function (fulfill, reject) {
                var blocks,
                processed,
                allFeatures,
                index = self.index,
                tabix = index && index.tabix,
                refId = tabix ? index.sequenceIndexMap[chr] : chr;

            blocks = index.blocksForRange(refId, start, end);

            if (!blocks || blocks.length === 0) {
                fulfill(null);
            }
            else {

                allFeatures = [];
                processed = 0;

                blocks.forEach(function (block) {

                    var startPos = block.minv.block,
                        startOffset = block.minv.offset,
                        endPos = block.maxv.block + (index.tabix ? MAX_GZIP_BLOCK_SIZE + 100 : 0),
                        options = {
                            headers: self.config.headers,           // http headers, not file header
                            range: {start: startPos, size: endPos - startPos + 1},
                            withCredentials: self.config.withCredentials,
                            task: task
                        },
                        success = function (data) {

                            var inflated, slicedData,
                                byteLength = data.byteLength;

                            processed++;

                            if (index.tabix) {

                                inflated = igvxhr.arrayBufferToString(igv.unbgzf(data));
                                // need to decompress data
                            }
                            else {
                                inflated = data;
                            }

                            slicedData = startOffset ? inflated.slice(startOffset) : inflated;
                            allFeatures = allFeatures.concat(self.parser.parseFeatures(slicedData));

                            if (processed === blocks.length) {
                                allFeatures.sort(function (a, b) {
                                    return a.start - b.start;
                                });
                                fulfill(allFeatures);
                            }
                        };


                    // Async load
                    if (self.localFile) {
                        igvxhr.loadStringFromFile(self.localFile, options).then(success);
                    }
                    else {
                        if (index.tabix) {
                            igvxhr.loadArrayBuffer(self.url, options).then(success);
                        }
                        else {
                            igvxhr.loadString(self.url, options).then(success);
                        }
                    }
                });

            }
        });

    }


    function getIndex() {

        var self = this,
            isIndeedIndexible = isIndexable.call(this);
        return new Promise(function (fulfill, reject) {

            if (self.indexed === undefined && isIndeedIndexible) {
                loadIndex.call(self).then(function (index) {
                    if (index) {
                        self.index = index;
                        self.indexed = true;
                    }
                    else {
                        self.indexed = false;
                    }
                    fulfill(self.index);
                });
            }
            else {
                fulfill(self.index);   // Is either already loaded, or there isn't one
            }

        });
    }

    igv.FeatureFileReader.prototype.readHeader = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {


            // We force a load of the index first

            getIndex.call(self).then(function (index) {

                if (index) {
                    // Load the file header (not HTTP header) for an indexed file.
                    // TODO -- note this will fail if the file header is > 65kb in size
                    var options = {
                            headers: self.config.headers,           // http headers, not file header
                            bgz: index.tabix,
                            range: {start: 0, size: 65000},
                            withCredentials: self.config.withCredentials
                        },
                        success = function (data) {
                            self.header = self.parser.parseHeader(data);
                            fulfill(self.header);
                        };

                    if (self.localFile) {
                        igvxhr.loadStringFromFile(self.localFile, options).then(success);
                    }
                    else {
                        igvxhr.loadString(self.url, options).then(success);
                    }
                }
                else {
                    loadFeaturesNoIndex.call(self, undefined).then(function (features) {
                        fulfill(self.header, features);       // Unfortunate use of side affect here
                    });
                }
            });
        });
    }

    /**
     *
     * @param fulfill
     * @param task
     * @param range -- genomic range to load.  For use with indexed source (optional)
     */
    igv.FeatureFileReader.prototype.readFeatures = function (chr, start, end, task) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            if (self.index) {
                loadFeaturesWithIndex.call(self, chr, start, end, task).then(packFeatures);
            }
            else {
                loadFeaturesNoIndex.call(self, task).then(packFeatures);
            }

            function packFeatures(features) {
                // TODO pack
                fulfill(features);
            }

        });
    }


    return igv;
})
(igv || {});
