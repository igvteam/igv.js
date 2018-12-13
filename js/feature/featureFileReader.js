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
    igv.FeatureFileReader = function (config, genome) {

        var uriParts;

        this.config = config || {};
        this.genome = genome;
        this.indexURL = config.indexURL;
        this.indexed = config.indexed;

        if (igv.isFilePath(this.config.url)) {
            this.filename = this.config.url.name;
        } else if (igv.isString(this.config.url) && this.config.url.startsWith('data:')) {
            this.indexed = false;  // by definition
            this.dataURI = config.url;
        } else {
            uriParts = igv.parseUri(this.config.url);
            this.filename = uriParts.file;
            this.path = uriParts.path;
        }

        this.format = this.config.format;

        this.parser = this.getParser(this.format, this.config.decode);
    };

    /**
     * Return a promise to load features for the genomic interval
     * @param chr
     * @param start
     * @param end
     */
    igv.FeatureFileReader.prototype.readFeatures = function (chr, start, end) {

        var self = this;

        return self.getIndex()
            .then(function (index) {
                if (index) {
                    return self.loadFeaturesWithIndex(chr, start, end);
                } else if (self.dataURI) {
                    return self.loadFeaturesFromDataURI();
                } else {
                    return self.loadFeaturesNoIndex()
                }
            });
    };

    igv.FeatureFileReader.prototype.readHeader = function () {

        var self = this;

        if (self.header) {
            return Promise.resolve(self.header);
        } else {

            return self.getIndex()

                .then(function (index) {

                    var options,
                        success;
                    if (self.dataURI) {

                        return self.loadFeaturesFromDataURI(self.dataURI)
                            .then(function (features) {
                                var header = self.header || {};
                                header.features = features;
                                return header;
                            })
                    } else if (index) {

                        // Load the file header (not HTTP header) for an indexed file.
                        // TODO -- note this will fail if the file header is > 65kb in size
                        options = igv.buildOptions(self.config, {bgz: index.tabix, range: {start: 0, size: 65000}});

                        return igv.xhr.loadString(self.config.url, options)
                            .then(function (data) {
                                self.header = self.parser.parseHeader(data);
                                return self.header
                            });
                    } else {
                        // If this is a non-indexed file we will load all features in advance
                        return self.loadFeaturesNoIndex()
                            .then(function (features) {
                                var header = self.header || {};
                                header.features = features;
                                return header;
                            })
                    }
                })
                .then(function (header) {
                    if (header && self.parser) {
                        self.parser.header = header;
                    }
                    return header;
                })
        }

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


    /**
     * Return a Promise for the async loaded index
     */
    igv.FeatureFileReader.prototype.loadIndex = function () {

        var idxFile = this.config.indexURL;

        if (this.filename.endsWith('.gz')) {

            if (!idxFile) {
                idxFile = this.config.url + '.tbi';
            }
            return igv.loadBamIndex(idxFile, this.config, true, this.genome);
            
        } else {

            if (!idxFile) {
                idxFile = this.config.url + '.idx';
            }
            return igv.loadTribbleIndex(idxFile, this.config, this.genome);
        }
    };

    igv.FeatureFileReader.prototype.loadFeaturesNoIndex = function () {

        var self = this;

        var options = igv.buildOptions(self.config);    // Add oauth token, if any

        return igv.xhr.loadString(self.config.url, options)
            .then(function (data) {
                self.header = self.parser.parseHeader(data);
                if (self.header instanceof String && self.header.startsWith("##gff-version 3")) {
                    self.format = 'gff3';
                }
                return self.parser.parseFeatures(data);   // <= PARSING DONE HERE
            })

    };

    igv.FeatureFileReader.prototype.loadFeaturesWithIndex = function (chr, start, end) {

        //console.log("Using index");
        var self = this;


        var blocks,
            tabix = self.index && self.index.tabix,
            refId = tabix ? self.index.sequenceIndexMap[chr] : chr,
            promises = [];

        blocks = self.index.blocksForRange(refId, start, end);

        if (!blocks || blocks.length === 0) {
            return Promise.resolve([]);
        } else {

            blocks.forEach(function (block) {

                promises.push(new Promise(function (fullfill, reject) {

                    var startPos = block.minv.block,
                        startOffset = block.minv.offset,
                        endPos,
                        options,
                        success;

                    endPos = block.maxv.block + MAX_GZIP_BLOCK_SIZE;

                    options = igv.buildOptions(self.config, {
                        range: {
                            start: startPos,
                            size: endPos - startPos + 1
                        }
                    });

                    success = function (data) {

                        var inflated,
                            slicedData,
                            slicedFeatures,
                            filteredFeatures,
                            f,
                            i;

                        if (self.index.tabix) {
                            inflated = new Uint8Array(igv.unbgzf(data));
                        } else {
                            inflated = data;
                        }

                        slicedData = startOffset ? inflated.slice(startOffset) : inflated;
                        slicedFeatures = self.parser.parseFeatures(slicedData);

                        // Filter features not in requested range.
                        filteredFeatures = [];
                        for (i = 0; i < slicedFeatures.length; i++) {
                            f = slicedFeatures[i];
                            if (f.start > end) break;
                            if (f.end >= start && f.start <= end) {
                                filteredFeatures.push(f);
                            }
                        }


                        fullfill(filteredFeatures);
                    };


                    // Async load
                    if (self.index.tabix) {
                        igv.xhr
                            .loadArrayBuffer(self.config.url, options)
                            .then(success)
                            .catch(reject);
                    } else {
                        igv.xhr
                            .loadString(self.config.url, options)
                            .then(success)
                            .catch(reject);
                    }

                }))
            });

            return Promise.all(promises)

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

                    return allFeatures;
                })
        }

    };

    igv.FeatureFileReader.prototype.getIndex = function () {

        var self = this;
        if (self.index !== undefined || self.indexed === false) {
            return Promise.resolve(self.index);
        }

        if (self.indexURL || self.indexed || (typeof self.config.url === 'string' && self.config.url.endsWith(".gz"))) {

            return self.loadIndex()

                .then(function (indexOrUndefined) {
                    if (indexOrUndefined) {
                        self.index = indexOrUndefined;
                        self.indexed = true;
                    } else {
                        self.indexed = false;
                    }
                    return self.index;
                })
                .catch(function (error) {
                    self.indexed = false;
                    if (self.config.indexURL !== undefined) {
                        self.config.browser.presentAlert("Index file not found.  Check track configuration", undefined)
                    }
                });
        } else {
            self.indexed = false;
            return Promise.resolve(undefined);
        }
    };

    igv.FeatureFileReader.prototype.loadFeaturesFromDataURI = function () {

        const plain = igv.decodeDataURI(this.dataURI)
        this.header = this.parser.parseHeader(plain);
        if (this.header instanceof String && this.header.startsWith("##gff-version 3")) {
            this.format = 'gff3';
        }
        const features = this.parser.parseFeatures(plain);
        return Promise.resolve(features);
    };

    return igv;
})
(igv || {});
