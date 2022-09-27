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

import BamReaderNonIndexed from "./bamReaderNonIndexed.js"
import ShardedBamReader from "./shardedBamReader.js"
import BamReader from "./bamReader.js"
import BamWebserviceReader from "./bamWebserviceReader.js"
import HtsgetBamReader from "../htsget/htsgetBamReader.js"
import CramReader from "../cram/cramReader.js"
import Ga4ghAlignmentReader from "../ga4gh/ga4ghAlignmentReader.js"
import {packAlignmentRows, unpairAlignments} from "./alignmentUtils.js"
import {isDataURL} from "../util/igvUtils.js"
import * as TrackUtils from "../util/trackUtils.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"

class BamSource {

    constructor(config, browser) {

        const genome = browser.genome

        this.config = config
        this.genome = genome

        if (isDataURL(config.url)) {
            this.config.indexed = false
        }

        if ("ga4gh" === config.sourceType) {
            this.bamReader = new Ga4ghAlignmentReader(config, genome)
        } else if ("pysam" === config.sourceType) {
            this.bamReader = new BamWebserviceReader(config, genome)
        } else if ("htsget" === config.sourceType) {
            this.bamReader = new HtsgetBamReader(config, genome)
        } else if ("shardedBam" === config.sourceType) {
            this.bamReader = new ShardedBamReader(config, genome)
        } else if ("cram" === config.format) {
            this.bamReader = new CramReader(config, genome, browser)
        } else {
            if (!this.config.indexURL && config.indexed !== false) {
                if (StringUtils.isString(this.config.url)) {
                    const inferIndexPath = TrackUtils.inferIndexPath(this.config.url, "bai")
                    if (inferIndexPath) {
                        console.error(`Warning: no indexURL specified for ${this.config.url}.  Guessing ${this.baiPath}`)
                        this.config.indexURL = inferIndexPath
                    } else {
                        console.error(`Warning: no indexURL specified for ${this.config.url}.`)
                        this.config.indexed = false
                    }
                } else {
                    console.error(`Warning: no indexURL specified for ${this.config.name}.`)
                    this.config.indexed = false
                }
            }

            if (this.config.indexed !== false) { // && this.config.indexURL) {
                this.bamReader = new BamReader(config, genome)
            } else {
                this.bamReader = new BamReaderNonIndexed(config, genome)
            }
        }

        this.viewAsPairs = config.viewAsPairs
        this.showSoftClips = config.showSoftClips
    }

    setViewAsPairs(bool) {
        this.viewAsPairs = bool
    }

    setShowSoftClips(bool) {
        this.showSoftClips = bool
    }

    async getAlignments(chr, bpStart, bpEnd) {

        const genome = this.genome
        const showSoftClips = this.showSoftClips

        const alignmentContainer = await this.bamReader.readAlignments(chr, bpStart, bpEnd)
        let alignments = alignmentContainer.alignments
        if (!this.viewAsPairs) {
            alignments = unpairAlignments([{alignments: alignments}])
        }
        const hasAlignments = alignments.length > 0
        alignmentContainer.packedAlignmentRows = packAlignmentRows(alignments, alignmentContainer.start, alignmentContainer.end, showSoftClips)

        this.alignmentContainer = alignmentContainer

        if (hasAlignments) {
            const sequence = await genome.sequence.getSequence(chr, alignmentContainer.start, alignmentContainer.end)
            if (sequence) {
                alignmentContainer.coverageMap.refSeq = sequence    // TODO -- fix this
                alignmentContainer.sequence = sequence           // TODO -- fix this
                return alignmentContainer
            } else {
                console.error("No sequence for: " + chr + ":" + alignmentContainer.start + "-" + alignmentContainer.end)
            }
        }
        return alignmentContainer

    }
}

export default BamSource
