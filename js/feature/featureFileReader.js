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

        var uriParts;

        this.config = config || {};

        if (igv.isFilePath(this.config.url)) {
            this.filename = this.config.url.name;
        } else {
            uriParts = igv.parseUri(this.config.url);
            this.filename = uriParts.file;
            this.path = uriParts.path;
        }

        this.format = this.config.format;

        this.parser = this.getParser(this.format, this.config.decode);

        this.supportsWholeGenome = (this.format === "seg");  // TODO -- move this up to track level
    };

    /**
     *
     * @param chr
     * @param start
     * @param end
     */
    igv.FeatureFileReader.prototype.readFeatures = function (chr, start, end) {

        var self = this;

        return new Promise(function (fullfill, reject) {

            if (self.index) {
                self
                    .loadFeaturesWithIndex(chr, start, end)
                    .then(packFeatures)
                    .catch(reject);
            } else {
                self
                    .loadFeaturesNoIndex()
                    .then(packFeatures)
                    .catch(reject);
            }

            function packFeatures(features) {
                // TODO pack
                fullfill(features);
            }

        });
    };

    igv.FeatureFileReader.prototype.readHeader = function () {

        var self = this;

        return new Promise(function (fullfill, reject) {

            if (self.header) {
                fullfill(self.header);
            } else {
                self
                    .getIndex()
                    .then(function (index) {

                        var options,
                            success;

                        if (index) {

                            // Load the file header (not HTTP header) for an indexed file.
                            // TODO -- note this will fail if the file header is > 65kb in size
                            options = igv.buildOptions(self.config, {bgz: index.tabix, range: {start: 0, size: 65000}});

                            success = function (data) {
                                self.header = self.parser.parseHeader(data);
                                fullfill(self.header);
                            };

                            igvxhr
                                .loadString(self.config.url, options)
                                .then(success)
                                .catch(function (error) {
                                    reject(error);
                                });

                        } else {
                            // If this is a non-indexed file we will load all features in advance
                            self
                                .loadFeaturesNoIndex()
                                .then(function (features) {
                                    var header = self.header || {};
                                    header.features = features;
                                    fullfill(header);
                                })
                                .catch(function (error) {
                                    reject(error);
                                });
                        }
                    })
                    .catch(function (error) {
                        reject(error);
                    });
            }
        });

    };

    igv.FeatureFileReader.prototype.getParser = function (format, decode) {

        switch (format) {
            case "vcf":
                return new igv.VcfParser();
            case "seg" :
                return new igv.SegParser();
            default:
                return new igv.FeatureParser(format, decode, this.config);
        }

    };

    igv.FeatureFileReader.prototype.isIndexable = function () {

        var hasIndexURL = (undefined !== this.config.indexURL),
            isValidType = (this.format !== 'wig' && this.format !== 'seg');

        return this.config.indexed != false && (hasIndexURL || isValidType);
    };

    /**
     * Return a Promise for the async loaded index
     */
    igv.FeatureFileReader.prototype.loadIndex = function () {
        var idxFile = this.config.indexURL;
        if (this.filename.endsWith('.gz')) {
            if (!idxFile) {
                idxFile = this.config.url + '.tbi';
            }
            return igv.loadBamIndex(idxFile, this.config, true);
        } else {
            if (!idxFile) {
                idxFile = this.config.url + '.idx';
            }
            return igv.loadTribbleIndex(idxFile, this.config);
        }
    };

    igv.FeatureFileReader.prototype.loadFeaturesNoIndex = function () {

        var self = this;

        return new Promise(function (fullfill, reject) {
            var options = igv.buildOptions(self.config);

            function parseData(data) {
                self.header = self.parser.parseHeader(data);
                if (self.header instanceof String && self.header.startsWith("##gff-version 3")) {
                    self.format = 'gff3';
                }
                fullfill(self.parser.parseFeatures(data));   // <= PARSING DONE HERE
            }

            igvxhr
                .loadString(self.config.url, options)
                .then(parseData)
                .catch(reject);

        });
    };

    igv.FeatureFileReader.prototype.loadFeaturesWithIndex = function (chr, start, end) {

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
            } else {

                blocks.forEach(function (block) {

                    promises.push(new Promise(function (fullfill, reject) {

                        var startPos = block.minv.block,
                            startOffset = block.minv.offset,
                            endPos,
                            options,
                            success;

                        endPos = endPos = block.maxv.block + MAX_GZIP_BLOCK_SIZE;

                        options = igv.buildOptions(self.config, {
                            range: {
                                start: startPos,
                                size: endPos - startPos + 1
                            }
                        });

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
                            igvxhr
                                .loadArrayBuffer(self.config.url, options)
                                .then(success)
                                .catch(reject);
                        } else {
                            igvxhr
                                .loadString(self.config.url, options)
                                .then(success)
                                .catch(reject);
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

    };

    igv.FeatureFileReader.prototype.getIndex = function () {

        var self = this;
        if (self.index !== undefined || self.config.indexed === false) {
            return Promise.resolve(self.index);
        }
        return new Promise(function (fullfill, reject) {

            if (self.isIndexable()) {
                self
                    .loadIndex()
                    .then(function (indexOrUndefined) {
                        if (indexOrUndefined) {
                            self.index = indexOrUndefined;
                            self.indexed = true;
                        } else {
                            self.indexed = false;
                        }
                        fullfill(self.index);
                    })
                    .catch(function (error) {
                        self.indexed = false;
                        if(error.message === '404' && self.config.indexURL === undefined) {
                            // This is an expected condition
                            console.log('No index file. No problem.');
                        } else {
                            reject(error);
                        }
                    });
            } else {
                self.indexed = false;
                fullfill(undefined);
            }

        });
    };

    return igv;
})
(igv || {});
