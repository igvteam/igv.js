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

import BamReaderNonIndexed from "./bamReaderNonIndexed.js";
import ShardedBamReader from "./shardedBamReader.js";
import BamReader from "./bamReader.js";
import BamWebserviceReader from "./bamWebserviceReader.js";
import HtsgetReader from "./htsgetReader.js";
import CramReader from "../cram/cramReader.js";
import Ga4ghAlignmentReader from "../ga4gh/ga4ghAlignmentReader.js";
import  {pairAlignments, unpairAlignments, packAlignmentRows} from "./alignmentUtils.js";
import {StringUtils} from "../../node_modules/igv-utils/src/index.js";

const isString = StringUtils.isString;

const BamSource = function (config, browser) {

    const genome = browser.genome;

    this.config = config;
    this.genome = genome;
    this.alignmentContainer = undefined;

    if (isString(config.url) && config.url.startsWith("data:")) {
        if ("cram" === config.format) {
            throw "CRAM data uris are not supported"
        }
        this.config.indexed = false;
    }

    if ("ga4gh" === config.sourceType) {
        this.bamReader = new Ga4ghAlignmentReader(config, genome);
    } else if ("pysam" === config.sourceType) {
        this.bamReader = new BamWebserviceReader(config, genome)
    } else if ("htsget" === config.sourceType) {
        this.bamReader = new HtsgetReader(config, genome);
    } else if ("shardedBam" === config.sourceType) {
        this.bamReader = new ShardedBamReader(config, genome);
    } else if ("cram" === config.format) {
        this.bamReader = new CramReader(config, genome, browser);
    } else {
        if (this.config.indexed === false) {
            this.bamReader = new BamReaderNonIndexed(config, genome);
        } else {
            this.bamReader = new BamReader(config, genome);
        }
    }

    this.viewAsPairs = config.viewAsPairs;
    this.showSoftClips = config.showSoftClips;
};

BamSource.prototype.setViewAsPairs = function (bool) {
    var self = this;

    if (this.viewAsPairs !== bool) {
        this.viewAsPairs = bool;
       // if (this.alignmentContainer) {
       //     this.alignmentContainer.setViewAsPairs(bool);
       // }
    }
}

BamSource.prototype.setShowSoftClips = function (bool) {
    if (this.showSoftClips !== bool) {
        this.showSoftClips = bool;
    }
}

BamSource.prototype.getAlignments = async function (chr, bpStart, bpEnd) {

    try {
        const genome = this.genome;
        const showSoftClips = this.showSoftClips;

        if (this.alignmentContainer && this.alignmentContainer.contains(chr, bpStart, bpEnd)) {
            return this.alignmentContainer;

        } else {
            const alignmentContainer = await this.bamReader.readAlignments(chr, bpStart, bpEnd)
            let alignments = alignmentContainer.alignments;
            if (!this.viewAsPairs) {
                alignments = unpairAlignments([{alignments: alignments}]);
            }
            const hasAlignments = alignments.length > 0;
            alignmentContainer.packedAlignmentRows = packAlignmentRows(alignments, alignmentContainer.start, alignmentContainer.end, showSoftClips);
            alignmentContainer.alignments = undefined;  // Don't need to hold onto these anymore

            this.alignmentContainer = alignmentContainer;

            if (!hasAlignments) {
                return alignmentContainer;
            } else {

                const sequence = await genome.sequence.getSequence(chr, alignmentContainer.start, alignmentContainer.end)
                if (sequence) {
                    alignmentContainer.coverageMap.refSeq = sequence;    // TODO -- fix this
                    alignmentContainer.sequence = sequence;           // TODO -- fix this
                    return alignmentContainer;
                } else {
                    console.error("No sequence for: " + chr + ":" + alignmentContainer.start + "-" + alignmentContainer.end)
                }
            }
        }
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export default BamSource;
