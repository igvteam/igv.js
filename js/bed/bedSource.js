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


    /**
     * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @constructor
     */
    igv.BedFeatureSource = function (config, parser) {

        this.config = config || {};
        if (config.localFile) {
            this.localFile = config.localFile;
            this.filename = config.localFile.name;
        }
        else {
            this.url = config.url;
            this.filename = config.url;
            this.indexUrl = config.indexUrl;
            this.headUrl = config.headUrl || this.filename;
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
     * @param queryChr
     * @param bpStart
     * @param bpEnd
     * @param success -- function that takes an array of features as an argument
     */
    igv.BedFeatureSource.prototype.getFeatures = function (queryChr, bpStart, bpEnd, success, task) {

        var myself = this,
            range = new igv.GenomicInterval(queryChr, bpStart, bpEnd),
            featureCache = this.featureCache;

        if (featureCache && (featureCache.range === undefined || featureCache.range.chr === queryChr)) {//}   featureCache.range.contains(queryChr, bpStart, bpEnd))) {
            success(this.featureCache.queryFeatures(queryChr, bpStart, bpEnd));

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
                    success(myself.featureCache.queryFeatures(queryChr, bpStart, bpEnd));

                },
                task, range);   // Currently loading at granularity of chromosome
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
        return this.config.indexUrl || (this.type != "wig" && this.config.indexed != false);
    }

    /**
     *
     * @param success
     * @param task
     * @param reange -- genomic range to load.  For use with indexed source (optional)
     */
    igv.BedFeatureSource.prototype.loadFeatures = function (success, task, range) {

        var myself = this,
            idxFile = myself.indexUrl,
            queryChr = range ? range.chr : undefined;


        if (this.index === undefined && range && isIndexable.call(this)) {  // TODO -  handle local files


            if (myself.url.endsWith(".gz")) {
                if (!idxFile) idxFile = myself.url + ".tbi";
                igv.loadBamIndex(idxFile, myself.config, function (index) {
                        myself.index = index;              // index might be null => no index, don't try again
                        if(index) {
                            loadFeaturesWithIndex(index);
                        }
                        else {
                            loadFeaturesNoIndex();
                        }
                    },
                    true);   // Boolean flag for "tabix"

            }
            else {
                if (!idxFile) idxFile = myself.url + ".idx";
                igv.loadTribbleIndex(idxFile, myself.config, function (index) {
                    myself.index = index;              // index might be null => no index, don't try again
                    if(index) {
                        loadFeaturesWithIndex(index);
                    }
                    else {
                        loadFeaturesNoIndex();
                    }
                });
            }
            return;

        }
        else {
            if (myself.index) {
                loadFeaturesWithIndex(myself.index);
            }
            else {
                loadFeaturesNoIndex();
            }
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
                loadHeaderWithIndex(index, function(header) {
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
                        endPos = block.maxv.block + (index.tabix ? 65000 : 0),
                        options = {
                            headers: myself.config.headers,           // http headers, not file header
                            range: {start: startPos, size: endPos - startPos + 1 },
                            success: function (data) {

                                var inflated;

                                processed++;

                                if (index.tabix) {

                                    inflated = igv.arrayBufferToString(igv.unbgzf(data));
                                    // need to decompress data
                                }
                                else {
                                    inflated = data;
                                }

                                allFeatures = allFeatures.concat(myself.parser.parseFeatures(inflated));

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
                igvxhr.getContentLength(myself.headUrl, {
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
