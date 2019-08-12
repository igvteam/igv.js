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

import AlignmentContainer from "./alignmentContainer";
import BamUtils from "./bamUtils";
import igvxhr from "../igvxhr";
import {buildOptions} from "../util/igvUtils";

/**
 * Class for reading bam records from an igv.js-flask server
 *
 * @param config
 * @constructor
 */
const BamWebserviceReader = function (config, genome) {

    this.config = config;
    this.genome = genome;
    BamUtils.setReaderDefaults(this, config);

};

// Example http://localhost:5000/alignments/?reference=/Users/jrobinso/hg19mini.fa&file=/Users/jrobinso/cram_with_crai_index.cram&region=1:100-2000

BamWebserviceReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

    var self = this;

    return getHeader.call(self)

        .then(function (header) {

            var queryChr, url;

            queryChr = header.chrAliasTable.hasOwnProperty(chr) ? header.chrAliasTable[chr] : chr;

            url = self.config.url +
                "?reference=" + self.config.referenceFile +
                "&file=" + self.config.alignmentFile + "" +
                "&region=" + queryChr + ":" + bpStart + "-" + bpEnd;


            return igvxhr.loadString(url, buildOptions(self.config))

                .then(function (sam) {

                    var alignmentContainer, chrId, ba;

                    chrId = header.chrToIndex[queryChr];

                    alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported);

                    BamUtils.decodeSamRecords(sam, alignmentContainer, queryChr, bpStart, bpEnd, self.filter);

                    return alignmentContainer;

                })

        })
}


// Example  http://localhost:5000/alignments/?reference=/Users/jrobinso/hg19mini.fa&file=/Users/jrobinso/cram_with_crai_index.cram&options=-b%20-H
function getHeader() {

    const self = this;
    const genome = this.genome;

    if (this.header) {

        return Promise.resolve(this.header);

    } else {

        const url = this.config.url + "?file=" + this.config.alignmentFile + "&options=-b,-H";
        const options = buildOptions(this.config);

        return BamUtils.readHeader(url, options, genome)

            .then(function (header) {

                self.header = header;
                return header;

            })
    }

}


function readInt(ba, offset) {
    return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
}

export default BamWebserviceReader;


