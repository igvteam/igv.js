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
            this.filename = config.filename || uriParts.file;
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
    igv.FeatureFileReader.prototype.readFeatures = async function (chr, start, end) {

        const index = await this.getIndex()
        if (index) {
            return this.loadFeaturesWithIndex(chr, start, end);
        } else if (this.dataURI) {
            return this.loadFeaturesFromDataURI();
        } else {
            return this.loadFeaturesNoIndex()
        }

    };

    igv.FeatureFileReader.prototype.readHeader = async function () {

        if (!this.header) {



            let header

            if (this.dataURI) {

                const features = await this.loadFeaturesFromDataURI(this.dataURI)
                header = this.header || {};
                header.features = features;

            } else {

                const index = await this.getIndex()
                if (index) {

                    // Load the file header (not HTTP header) for an indexed file.

                    let maxSize = "vcf" === this.config.format ? 65000 : 1000
                    if (index.tabix) {
                        const bsizeOptions = igv.buildOptions(this.config, {
                            range: {
                                start: index.firstAlignmentBlock,
                                size: 26
                            }
                        });
                        const abuffer = await igv.xhr.loadArrayBuffer(this.config.url, bsizeOptions)
                        const bsize = igv.bgzBlockSize(abuffer)
                        maxSize = index.firstAlignmentBlock + bsize;
                    } else {

                    }

                    const options = igv.buildOptions(this.config, {bgz: index.tabix, range: {start: 0, size: maxSize}});

                    const data = await igv.xhr.loadString(this.config.url, options)
                    header = this.parser.parseHeader(data);


                } else {
                    // If this is a non-indexed file we will load all features in advance
                    const features = await this.loadFeaturesNoIndex()
                    header = this.header || {};
                    header.features = features;
                }


                if (header && this.parser) {
                    this.parser.header = header;
                }

                this.header = header;
                return header;
            }
        }
        return this.header;

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

        let idxFile = this.config.indexURL;

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

    igv.FeatureFileReader.prototype.loadFeaturesNoIndex = async function () {

        const options = igv.buildOptions(this.config);    // Add oauth token, if any
        const data = await igv.xhr.loadString(this.config.url, options)

        this.header = this.parser.parseHeader(data);
        if (this.header instanceof String && this.header.startsWith("##gff-version 3")) {
            this.format = 'gff3';
        }
        return this.parser.parseFeatures(data);   // <= PARSING DONE HERE


    };

    igv.FeatureFileReader.prototype.loadFeaturesWithIndex = async function (chr, start, end) {

        //console.log("Using index");
        const config = this.config
        const parser = this.parser
        const tabix = this.index.tabix
        const refId = tabix ? this.index.sequenceIndexMap[chr] : chr
        const promises = []

        const blocks = this.index.blocksForRange(refId, start, end);

        if (!blocks || blocks.length === 0) {
            return Promise.resolve([]);
        } else {

            blocks.forEach(function (block) {

                promises.push(new Promise(async function (fullfill, reject) {

                    const startPos = block.minv.block
                    const startOffset = block.minv.offset
                    const endOffset = block.maxv.offset
                    let endPos

                    if (tabix) {
                        let lastBlockSize = 0
                        if (endOffset > 0) {
                            const bsizeOptions = igv.buildOptions(config, {
                                range: {
                                    start: block.maxv.block,
                                    size: 26
                                }
                            });
                            const abuffer = await igv.xhr.loadArrayBuffer(config.url, bsizeOptions)
                            lastBlockSize = igv.bgzBlockSize(abuffer)
                        }
                        endPos = block.maxv.block + lastBlockSize;
                    } else {
                        endPos = block.maxv.block;
                    }

                    const options = igv.buildOptions(config, {
                        range: {
                            start: startPos,
                            size: endPos - startPos + 1
                        }
                    });

                    const success = function (inflated) {
                        const slicedData = startOffset ? inflated.slice(startOffset) : inflated;
                        const slicedFeatures = parser.parseFeatures(slicedData);

                        // Filter features not in requested range.
                        const filteredFeatures = [];
                        for (let f of slicedFeatures) {
                            if (f.start > end) break;
                            if (f.end >= start && f.start <= end) {
                                filteredFeatures.push(f);
                            }
                        }
                        fullfill(filteredFeatures);
                    };

                    if (tabix) {
                        igv.xhr
                            .loadArrayBuffer(config.url, options)
                            .then(function (data) {
                                const inflated = new Uint8Array(igv.unbgzf(data))
                                success(inflated)
                            })
                            .catch(reject);
                    } else {
                        igv.xhr
                            .loadString(config.url, options)
                            .then(success)
                            .catch(reject);
                    }
                }))
            });

            const featureArrays = await Promise.all(promises)

            let allFeatures = featureArrays[0];
            if (allFeatures.length > 1) {
                allFeatures = featureArrays[0];
                for (let i = 1; i < featureArrays.length; i++) {
                    allFeatures = allFeatures.concat(featureArrays[i]);
                }
                allFeatures.sort(function (a, b) {
                    return a.start - b.start;
                });
            }

            return allFeatures;
        }
    }

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

    igv.FeatureFileReader.prototype.loadFeaturesFromDataURI = async function () {

        const plain = igv.decodeDataURI(this.dataURI)
        this.header = this.parser.parseHeader(plain);
        if (this.header instanceof String && this.header.startsWith("##gff-version 3")) {
            this.format = 'gff3';
        }
        const features = this.parser.parseFeatures(plain);
        return features;
    };

    return igv;
})
(igv || {});
