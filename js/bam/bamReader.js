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

import {loadIndex} from "./indexFactory.js"
import AlignmentContainer from "./alignmentContainer.js"
import BamUtils from "./bamUtils.js"
import {BGZip, igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"

/**
 * Class for reading a bam file
 *
 * @param config
 * @constructor
 */
class BamReader {

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.bamPath = config.url
        this.baiPath = config.indexURL
        BamUtils.setReaderDefaults(this, config)
    }

    async readAlignments(chr, bpStart, bpEnd) {

        const chrToIndex = await this.getChrIndex()
        const queryChr = this.chrAliasTable.hasOwnProperty(chr) ? this.chrAliasTable[chr] : chr
        const chrId = chrToIndex[queryChr]
        const alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, this.config)

        if (chrId === undefined) {
            return alignmentContainer

        } else {

            const bamIndex = await this.getIndex()
            const chunks = bamIndex.blocksForRange(chrId, bpStart, bpEnd)

            if (!chunks || chunks.length === 0) {
                return alignmentContainer
            }

            let counter = 1
            for (let c of chunks) {

                let lastBlockSize
                if (c.maxv.offset === 0) {
                    lastBlockSize = 0    // Don't need to read the last block.
                } else {
                    const bsizeOptions = buildOptions(this.config, {range: {start: c.maxv.block, size: 26}})
                    const abuffer = await igvxhr.loadArrayBuffer(this.bamPath, bsizeOptions)
                    lastBlockSize = BGZip.bgzBlockSize(abuffer)
                }
                const fetchMin = c.minv.block
                const fetchMax = c.maxv.block + lastBlockSize
                const range = {start: fetchMin, size: fetchMax - fetchMin + 1}

                const compressed = await igvxhr.loadArrayBuffer(this.bamPath, buildOptions(this.config, {range: range}))

                var ba = BGZip.unbgzf(compressed) //new Uint8Array(BGZip.unbgzf(compressed)); //, c.maxv.block - c.minv.block + 1));
                const done = BamUtils.decodeBamRecords(ba, c.minv.offset, alignmentContainer, this.indexToChr, chrId, bpStart, bpEnd, this.filter)

                if (done) {
                    //    console.log(`Loaded ${counter} chunks out of  ${chunks.length}`);
                    break
                }
                counter++
            }
            alignmentContainer.finish()
            return alignmentContainer
        }
    }

    async getHeader() {
        if (!this.header) {
            const genome = this.genome
            const index = await this.getIndex()
            let start
            let len
            if (index.firstBlockPosition) {
                const bsizeOptions = buildOptions(this.config, {range: {start: index.firstBlockPosition, size: 26}})
                const abuffer = await igvxhr.loadArrayBuffer(this.bamPath, bsizeOptions)
                const bsize = BGZip.bgzBlockSize(abuffer)
                len = index.firstBlockPosition + bsize   // Insure we get the complete compressed block containing the header
            } else {
                len = 64000
            }

            const options = buildOptions(this.config, {range: {start: 0, size: len}})
            this.header = await BamUtils.readHeader(this.bamPath, options, genome)
        }
        return this.header
    }

    async getIndex() {
        const genome = this.genome
        if (!this.index) {
            this.index = await loadIndex(this.baiPath, this.config, genome)
        }
        return this.index
    }

    async getChrIndex() {
        if (this.chrToIndex) {
            return this.chrToIndex
        } else {
            const header = await this.getHeader()
            this.chrToIndex = header.chrToIndex
            this.indexToChr = header.chrNames
            this.chrAliasTable = header.chrAliasTable
            return this.chrToIndex

        }
    }
}

export default BamReader

