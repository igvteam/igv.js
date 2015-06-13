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


    function loadIndex(continuation) {
        var idxFile = this.indexURL;
        if (this.url.endsWith(".gz")) {
            if (!idxFile) idxFile = this.url + ".tbi";
            igv.loadBamIndex(idxFile, this.config, continuation, true);
        }
        else {
            if (!idxFile) idxFile = this.url + ".idx";
            igv.loadTribbleIndex(idxFile, this.config, continuation);
        }
    }


    function loadFeaturesNoIndex(continuation, task) {

        var parser = this.parser,
            self = this,
            options = {
                headers: this.config.headers,           // http headers, not file header
                success: (function (data) {
                    self.header = parser.parseHeader(data);
                    continuation(parser.parseFeatures(data));   // <= PARSING DONE HERE
                }),
                task: task
            };

        if (this.localFile) {
            igvxhr.loadStringFromFile(this.localFile, options);
        }
        else {
            igvxhr.loadString(this.url, options);
        }
    }

    igv.FeatureFileReader.prototype.readHeader = function (continuation) {

        var myself = this,
            isIndeedIndexible = isIndexable.call(this);

        if (this.indexed === undefined && isIndeedIndexible) {

            loadIndex.call(this, function (index) {
                if (index) {
                    myself.index = index;
                    myself.indexed = true;
                }
                else {
                    myself.indexed = false;
                }
                myself.readHeader(continuation);
            });
            return;
        }

        if (this.index) {
            loadHeaderWithIndex(this.index, continuation);
        }
        else {
            loadFeaturesNoIndex.call(this, function (features) {
                continuation(myself.header, features);
            });
        }

        /**
         * Load the file header (not HTTP header) for an indexed file.
         * TODO -- note this will fail if the file header is > 65kb in size
         *
         * @param index
         */
        function loadHeaderWithIndex(index, continuation) {

            var options = {
                headers: myself.config.headers,           // http headers, not file header
                bgz: index.tabix,
                range: {start: 0, size: 65000},
                success: function (data) {
                    myself.header = myself.parser.parseHeader(data);
                    continuation(myself.header);
                }
            };

            if (myself.localFile) {
                igvxhr.loadStringFromFile(myself.localFile, options);
            }
            else {
                igvxhr.loadString(myself.url, options);
            }
        }
    }

    /**
     *
     * @param success
     * @param task
     * @param range -- genomic range to load.  For use with indexed source (optional)
     */
    igv.FeatureFileReader.prototype.readFeatures = function (success, task, range) {

        var myself = this;

        if (this.index) {
            loadFeaturesWithIndex(this.index, packFeatures);
        }
        else {
            loadFeaturesNoIndex.call(this, packFeatures, task);
        }

        function packFeatures(features) {
            // TODO pack
            success(features);
        }

        function loadFeaturesWithIndex(index, continuation) {

            //console.log("Using index");

            var blocks,
                processed,
                allFeatures,
                tabix = index && index.tabix,
                refId = tabix ? index.sequenceIndexMap[range.chr] : range.chr;

            blocks = index.blocksForRange(refId, range.start, range.end);

            if (!blocks || blocks.length === 0) {
                success(null);
            }
            else {

                allFeatures = [];
                processed = 0;

                blocks.forEach(function (block) {

                    var startPos = block.minv.block,
                        startOffset = block.minv.offset,
                        endPos = block.maxv.block + (index.tabix ? MAX_GZIP_BLOCK_SIZE + 100 : 0);
                    options = {
                        headers: myself.config.headers,           // http headers, not file header
                        range: {start: startPos, size: endPos - startPos + 1},
                        success: function (data) {

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
                            allFeatures = allFeatures.concat(myself.parser.parseFeatures(slicedData));

                            if (processed === blocks.length) {
                                allFeatures.sort(function (a, b) {
                                    return a.start - b.start;
                                });
                                continuation(allFeatures);
                            }
                        },
                        task: task
                    };


                    // Async load
                    if (myself.localFile) {
                        igvxhr.loadStringFromFile(myself.localFile, options);
                    }
                    else {
                        if (index.tabix) {
                            igvxhr.loadArrayBuffer(myself.url, options);
                        }
                        else {
                            igvxhr.loadString(myself.url, options);
                        }
                    }
                });

            }

        }


    }


    return igv;
})
(igv || {});
