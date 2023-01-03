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

import BinaryParser from "../binary.js"

const SEQUENCE_DICTIONARY_FLAG = 0x8000  // if we have a sequence dictionary in our header

async function parseTribbleIndex(arrayBuffer, genome) {

    const index = new TribbleIndex()
    index.parse(arrayBuffer, genome)
    return index
}

class TribbleIndex {

    constructor() {

    }

    async parse(arrayBuffer, genome) {

        let blockMax = 0
        this.chrIndex = {}
        this.lastBlockPosition = []
        const parser = new BinaryParser(new DataView(arrayBuffer))
        readHeader(parser)

        let nChrs = parser.getInt()
        while (nChrs-- > 0) {

            // todo -- support interval tree index, we're assuming its a linear index

            let chr = parser.getString()
            if (genome) chr = genome.getChromosomeName(chr) // Translate to canonical name

            const binWidth = parser.getInt()
            const nBins = parser.getInt()
            const longestFeature = parser.getInt()
            const OLD_V3_INDEX = parser.getInt() > 0
            const nFeatures = parser.getInt()

            // note the code below accounts for > 60% of the total time to read an index
            let pos = parser.getLong()
            const blocks = []
            for (let binNumber = 0; binNumber < nBins; binNumber++) {
                const nextPos = parser.getLong()
                const size = nextPos - pos
                blocks.push({min: pos, max: nextPos}) //        {position: pos, size: size});
                pos = nextPos
                if (nextPos > blockMax) {
                    blockMax = nextPos
                }
            }
            this.chrIndex[chr] = {chr: chr, blocks: blocks, longestFeature: longestFeature, binWidth: binWidth}
        }

        this.lastBlockPosition = blockMax


        /**
         * Read the header .   Data here is not used in igv.js but we need to read it to advance the pointer.
         * @param parser
         */
        function readHeader(parser) {

            const magicNumber = parser.getInt()     //   view._getInt32(offset += 32, true);
            const type = parser.getInt()
            const version = parser.getInt()
            const indexedFile = parser.getString()
            const indexedFileSize = parser.getLong()
            const indexedFileTS = parser.getLong()
            const indexedFileMD5 = parser.getString()
            const flags = parser.getInt()
            if (version < 3 && (flags & SEQUENCE_DICTIONARY_FLAG) === SEQUENCE_DICTIONARY_FLAG) {
                // readSequenceDictionary(dis);
            }
            if (version >= 3) {
                let nProperties = parser.getInt()
                while (nProperties-- > 0) {
                    const key = parser.getString()
                    const value = parser.getString()
                }
            }
        }
    }

    get chromosomeNames() {
        return Object.keys(this.chrIndex)
    }


    /**
     * Fetch blocks for a particular genomic range.
     *
     * @param queryChr the sequence dictionary index of the chromosome
     * @param min  genomic start position
     * @param max  genomic end position
     */
    chunksForRange(queryChr, min, max) { //function (refId, min, max) {

        const self = this
        const chrIdx = this.chrIndex[queryChr]

        if (chrIdx) {
            const blocks = chrIdx.blocks
            const longestFeature = chrIdx.longestFeature
            const binWidth = chrIdx.binWidth
            const adjustedPosition = Math.max(min - longestFeature, 0)
            const startBinNumber = Math.floor(adjustedPosition / binWidth)

            if (startBinNumber >= blocks.length) // are we off the end of the bin list, so return nothing
                return []
            else {
                const endBinNumber = Math.min(Math.floor((max - 1) / binWidth), blocks.length - 1)

                // By definition blocks are adjacent in the file for the liner index.  Combine them into one merged block
                const startPos = blocks[startBinNumber].min
                const endPos = blocks[endBinNumber].max
                const size = endPos - startPos
                if (size === 0) {
                    return []
                } else {
                    const mergedBlock = {minv: {block: startPos, offset: 0}, maxv: {block: endPos, offset: 0}}
                    return [mergedBlock]
                }
            }
        } else {
            return undefined
        }
    }
}

export {parseTribbleIndex}
