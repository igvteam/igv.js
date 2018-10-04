/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
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


    const MAX_GZIP_BLOCK_SIZE = 65536; // See BGZF compression format in SAM format specification

    /**
     * Class for reading a bam file
     *
     * @param config
     * @constructor
     */
    igv.BamReader = function (config, genome) {

        this.config = config;

        this.genome = genome;

        this.bamPath = config.url;

        // Todo - deal with Picard convention.  WHY DOES THERE HAVE TO BE 2?
        this.baiPath = config.indexURL || igv.inferIndexPath(this.bamPath, "bai"); // If there is an indexURL provided, use it!

        igv.BamUtils.setReaderDefaults(this, config);

    };

    igv.BamReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

        var self = this;


        return getChrIndex.call(self)

            .then(function (chrToIndex) {

                var chrId, queryChr, alignmentContainer;

                queryChr = self.chrAliasTable.hasOwnProperty(chr) ? self.chrAliasTable[chr] : chr;

                chrId = chrToIndex[queryChr];

                alignmentContainer = new igv.AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported);

                if (chrId === undefined) {
                    return Promise.resolve(alignmentContainer);

                } else {

                    return getIndex.call(self)

                        .then(function (bamIndex) {

                            var chunks = bamIndex.blocksForRange(chrId, bpStart, bpEnd),
                                promises = [];


                            if (!chunks) {
                                return Promise.resolve(null);
                            }
                            if (chunks.length === 0) {
                                return Promise.resolve(alignmentContainer);
                            }

                            chunks.forEach(function (c) {

                                promises.push(new Promise(function (fulfill, reject) {

                                    var fetchMin = c.minv.block,
                                        fetchMax = c.maxv.block + 65000,   // Make sure we get the whole block.
                                        range = {start: fetchMin, size: fetchMax - fetchMin + 1};

                                    igv.xhr.loadArrayBuffer(self.bamPath, igv.buildOptions(self.config, {range: range}))
                                        .then(function (compressed) {

                                            var ba = new Uint8Array(igv.unbgzf(compressed)); //new Uint8Array(igv.unbgzf(compressed)); //, c.maxv.block - c.minv.block + 1));
                                            igv.BamUtils.decodeBamRecords(ba, c.minv.offset, alignmentContainer, self.indexToChr, chrId, bpStart, bpEnd, self.filter);

                                            fulfill(alignmentContainer);

                                        })
                                        .catch(reject);

                                }));
                            });

                            return Promise.all(promises);
                        })
                        .then(function (ignored) {
                            alignmentContainer.finish();
                            return alignmentContainer;
                        });
                }
            });
    };

    function readHeader() {

        const self = this;
        const genome = this.genome;

        return getIndex.call(self)

            .then(function (index) {

                const len = index.firstAlignmentBlock + MAX_GZIP_BLOCK_SIZE;   // Insure we get the complete compressed block containing the header

                const options = igv.buildOptions(self.config, {range: {start: 0, size: len}});

                return igv.BamUtils.readHeader(self.bamPath, options, genome);
            })
            .then(function (header) {
                return header;
            });
    };

    function getIndex() {

        const self = this;
        const genome = this.genome;

        if (self.index) {
            return Promise.resolve(self.index);
        }
        else {
            return igv.loadBamIndex(self.baiPath, self.config, false, genome)
                .then(function (index) {
                    self.index = index;
                    return self.index;
                });
        }
    }

    function getChrIndex() {

        var self = this;

        if (this.chrToIndex) {
            return Promise.resolve(this.chrToIndex);
        }
        else {
            return readHeader.call(self).then(function (header) {
                self.chrToIndex = header.chrToIndex;
                self.indexToChr = header.chrNames;
                self.chrAliasTable = header.chrAliasTable;
                return self.chrToIndex;
            });
        }
    }

    return igv;

})
(igv || {});


