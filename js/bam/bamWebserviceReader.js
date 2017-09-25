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


    const MAX_GZIP_BLOCK_SIZE = 65536;   //  APPARENTLY.  Where is this documented???
    const DEFAULT_SAMPLING_WINDOW_SIZE = 100;
    const DEFAULT_SAMPLING_DEPTH = 50;
    const MAXIMUM_SAMPLING_DEPTH = 2500;

    /**
     * Class for reading a bam file
     *
     * @param config
     * @constructor
     */
    igv.BamWebserviceReader = function (config) {

        this.config = config;

        this.filter = config.filter || new igv.BamFilter();

        this.samplingWindowSize = config.samplingWindowSize === undefined ? DEFAULT_SAMPLING_WINDOW_SIZE : config.samplingWindowSize;
        this.samplingDepth = config.samplingDepth === undefined ? DEFAULT_SAMPLING_DEPTH : config.samplingDepth;

        if (this.samplingDepth > MAXIMUM_SAMPLING_DEPTH) {
            igv.log("Warning: attempt to set sampling depth > maximum value of 2500");
            this.samplingDepth = MAXIMUM_SAMPLING_DEPTH;
        }

        if (config.viewAsPairs) {
            this.pairsSupported = true;
        }
        else {
            this.pairsSupported = config.pairsSupported === undefined ? true : config.pairsSupported;
        }

    };

    // Example http://localhost:5000/alignments/?reference=/Users/jrobinso/hg19mini.fa&file=/Users/jrobinso/cram_with_crai_index.cram&region=1:100-2000
    igv.BamWebserviceReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            getHeader.call(self)

                .then(function (header) {

                    var queryChr, url;

                    queryChr = header.chrAliasTable.hasOwnProperty(chr) ? header.chrAliasTable[chr] : chr;

                    url = self.config.url  +
                        "?reference=" + self.config.referenceFile +
                        "&file=" + self.config.alignmentFile + "" +
                        "&region=" + queryChr + ":" + bpStart + "-" + bpEnd;


                    igv.xhr.loadString(url, igv.buildOptions(self.config))
                        .then(function (sam) {

                            var alignmentContainer, chrId, ba;

                            chrId = header.chrToIndex[queryChr];

                            alignmentContainer= new igv.AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported);

                            igv.BamUtils.decodeSamRecords(sam, alignmentContainer, queryChr,  bpStart, bpEnd, self.filter);

                            fulfill(alignmentContainer);

                        }).catch(function (obj) {
                        reject(obj);
                    });

                })
                .catch(reject);
        });

    }


    // Example  http://localhost:5000/alignments/?reference=/Users/jrobinso/hg19mini.fa&file=/Users/jrobinso/cram_with_crai_index.cram&options=-b%20-H
    function getHeader() {

        var self = this;

        if (this.header) {
            return Promise.resolve(this.header)
        } else {
            var url = this.config.url + "?file=" + this.config.alignmentFile + "&options=-b,-H",
                options = igv.buildOptions(this.config),
                genome = igv.browser ? igv.browser.genome : null;

            return new Promise(function (fulfill, reject) {
                igv.BamUtils.readHeader(url, options, genome)
                    .then(function (header) {
                        self.header = header;
                        fulfill(header);
                    })
                    .catch(reject);
            });
        }

    }


    function readInt(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    }

    return igv;

})
(igv || {});


