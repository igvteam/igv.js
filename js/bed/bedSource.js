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
     * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @constructor
     */
    igv.BedFeatureSource = function (config) {

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

        if (config.type) {
            this.type = config.type;
        }
        else {
            this.type = igv.inferFileType(this.filename);
        }

        this.parser = getParser(this.type);
    };


    function getParser(type) {
        if (type === "vcf") {
            return new igv.VcfParser();
        } else if (type === "seg") {
            return new igv.SegParser();
        }
        else {
            return new igv.BedParser(type);
        }
    }

    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the success function.  Usually this is
     * a function that renders the features on the canvas
     *
     * @param chr
     * @param bpStart
     * @param bpEnd
     * @param success -- function that takes an array of features as an argument
     * @param task
     */
    igv.BedFeatureSource.prototype.getFeatures = function (chr, bpStart, bpEnd, success, task) {

        var myself = this,
            range = new igv.GenomicInterval(chr, bpStart, bpEnd),
            featureCache = this.featureCache;

        if (featureCache && (featureCache.range === undefined || featureCache.range.containsRange(range))) {//}   featureCache.range.contains(queryChr, bpStart, bpEnd))) {
            success(this.featureCache.queryFeatures(chr, bpStart, bpEnd));

        }
        else {
            this.loadFeatures(function (featureList) {
                    //myself.featureMap = featureMap;

                    myself.featureCache = new igv.FeatureCache(featureList);   // Note - replacing previous cache with new one

                    // Record range queried if we have an index
                    if (myself.index) {
                        myself.featureCache.range = range;
                    }

                    // Finally pass features for query interval to continuation
                    success(myself.featureCache.queryFeatures(chr, bpStart, bpEnd));

                },
                task,
                range);   // Currently loading at granularity of chromosome
        }

    };

    igv.BedFeatureSource.prototype.allFeatures = function (success) {

        this.getFeatureCache(function (featureCache) {
            success(featureCache.allFeatures());
        });

    };

    /**
     * Get the feature cache.  This method is exposed for use by cursor.  Loads all features (index not used).
     * @param success
     */
    igv.BedFeatureSource.prototype.getFeatureCache = function (success) {

        var myself = this;

        if (this.featureCache) {
            success(this.featureCache);
        }
        else {
            this.loadFeatures(function (featureList) {
                //myself.featureMap = featureMap;
                myself.featureCache = new igv.FeatureCache(featureList);
                // Finally pass features for query interval to continuation
                success(myself.featureCache);

            });
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
        return;
    }

    /**
     *
     * @param success
     * @param task
     * @param range -- genomic range to load.  For use with indexed source (optional)
     */
    igv.BedFeatureSource.prototype.loadFeatures = function (success, task, range) {

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
                myself.loadFeatures(success, task, range);
            });
            return;
        }

        if (this.index) {
            loadFeaturesWithIndex(this.index);
        }
        else {
            loadFeaturesNoIndex();
        }


        function loadFeaturesNoIndex() {

            var parser = myself.parser,
                options = {
                    headers: myself.config.headers,           // http headers, not file header
                    success: function (data) {
                        myself.header = parser.parseHeader(data);
                        success(parser.parseFeatures(data));   // <= PARSING DONE HERE
                    },
                    task: task
                };

            if (myself.localFile) {
                igvxhr.loadStringFromFile(myself.localFile, options);
            }
            else {
                igvxhr.loadString(myself.url, options);
            }
        }

        function loadFeaturesWithIndex(index) {

            if (!myself.header) {
                loadHeaderWithIndex(index, function (header) {
                    myself.header = header || {};
                    loadFeaturesWithIndex(index);
                });
                return;
            }
            console.log("Using index");

            var blocks, processed, allFeatures,
                tabix = index && index.tabix,
                refId = tabix ? index.sequenceIndexMap[range.chr] : range.chr;

            blocks = index.blocksForRange(refId, range.start, range.end);

            if (!blocks || blocks.length === 0) {
                success(null);
            }
            else {

                allFeatures = [],
                    processed = 0;

                blocks.forEach(function (block) {

                    var startPos = block.minv.block,
                        startOffset = block.minv.offset,
                        endPos = block.maxv.block + (index.tabix ? MAX_GZIP_BLOCK_SIZE + 100 : 0);
                        options = {
                            headers: myself.config.headers,           // http headers, not file header
                            range: {start: startPos, size: endPos - startPos + 1 },
                            success: function (data) {

                                var inflated, slicedData,
                                    byteLength = data.byteLength;

                                processed++;

                                if (index.tabix) {

                                    inflated = igv.arrayBufferToString(igv.unbgzf(data));
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
                                    success(allFeatures);
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

        /**
         * Load the file header (not HTTP header) for an indexed file.
         *
         * @param index
         */
        function loadHeaderWithIndex(index, continuation) {

            //continuation({});
            getContentLength(function (contentLength) {

                var rangeEnd = Math.min(contentLength, 65000),

                    options = {
                        headers: myself.config.headers,           // http headers, not file header
                        range: {start: 0, size: rangeEnd},
                        bgz: index.tabix,
                        success: function (data) {
                            myself.header = myself.parser.parseHeader(data);
                            continuation(myself.header);
                        },

                        task: task
                    };

                if (myself.localFile) {
                    igvxhr.loadStringFromFile(myself.localFile, options);
                }
                else {
                    igvxhr.loadString(myself.url, options);
                }
            });
        }


        function getContentLength(continuation) {
            if (myself.contentLength) {
                continuation(myself.contentLength);
            }
            else {

                // Gen the content length first, so we don't try to read beyond the end of the file
                igvxhr.getContentLength(myself.headURL, {
                    headers: myself.config.headers,
                    success: function (contentLength) {
                        myself.contentLength = contentLength;
                        continuation(contentLength);

                    },
                    error: function () {
                        myself.contentLength = -1;
                        continuation(-1);
                    }

                });
            }
        }


    }

    return igv;
})
(igv || {});
