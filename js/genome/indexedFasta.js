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

// Indexed fasta files
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import GenomicInterval from "./genomicInterval.js"
import Chromosome from "./chromosome.js"
import {buildOptions} from "../util/igvUtils.js"

const splitLines = StringUtils.splitLines

const reservedProperties = new Set(['fastaURL', 'indexURL', 'compressedIndexURL', 'cytobandURL', 'indexed'])

class FastaSequence {

    constructor(reference) {

        this.file = reference.fastaURL
        this.indexFile = reference.indexURL || reference.indexFile || this.file + ".fai"
        this.compressedIndexFile = reference.compressedIndexURL || false
        this.withCredentials = reference.withCredentials
        this.chromosomeNames = []
        this.chromosomes = {}
        this.sequences = {}
        this.offsets = {}

        // Build a track-like config object from the referenceObject
        const config = {}
        for (let key in reference) {
            if (reference.hasOwnProperty(key) && !reservedProperties.has(key)) {
                config[key] = reference[key]
            }
        }
        this.config = config
    }


    async init() {
        return this.getIndex()
    }

    async getSequence(chr, start, end) {

        const hasCachedSquence = this.interval && this.interval.contains(chr, start, end)

        if (!hasCachedSquence) {

            // Expand query, to minimum of 50kb
            let qstart = start
            let qend = end
            if ((end - start) < 50000) {
                const w = (end - start)
                const center = Math.round(start + w / 2)
                qstart = Math.max(0, center - 25000)
                qend = center + 25000
            }

            const seqBytes = await this.readSequence(chr, qstart, qend)
            this.interval = new GenomicInterval(chr, qstart, qend, seqBytes)
        }

        const offset = start - this.interval.start
        const n = end - start
        const seq = this.interval.features ? this.interval.features.substr(offset, n) : null
        return seq
    }

    async getIndex() {

        if (this.index) {
            return this.index
        } else {
            const data = await igvxhr.load(this.indexFile, buildOptions(this.config))
            const lines = splitLines(data)
            const len = lines.length
            let lineNo = 0
            let order = 0
            this.index = {}

            while (lineNo < len) {
                const tokens = lines[lineNo++].split("\t")
                const nTokens = tokens.length

                if (nTokens === 5) {
                    // Parse the index line.
                    const chr = tokens[0]
                    const size = parseInt(tokens[1])
                    const position = parseInt(tokens[2])
                    const basesPerLine = parseInt(tokens[3])
                    const bytesPerLine = parseInt(tokens[4])

                    const indexEntry = {
                        size: size,
                        position: position,
                        basesPerLine: basesPerLine,
                        bytesPerLine: bytesPerLine
                    }

                    this.chromosomeNames.push(chr)
                    this.index[chr] = indexEntry
                    this.chromosomes[chr] = new Chromosome(chr, order++, size)
                }
            }
            return this.index
        }
    }


    //Code is losely based on https://github.com/GMOD/bgzf-filehandle
    //Reworked however in orde to work with the igvxhr interface for loading files
    //Additionally, replaced calls to the Long.js interface with standard JS calls for ArrayBuffers and the associated views
    //
    //The compressed index is an array of blocks, with each block being a pair: compressed-position & uncompressed-position (both in bytes)
    async getCompressedIndex() {
        const GZI_NUM_BYTES_OFFSET = 8
        const GZI_NUM_BYTES_BLOCK = 8
        if (this.compressedIndex) {
            return this.compressedIndex
        }
        if (!this.compressedIndexFile) {
            this.compressedIndex = []
            return this.compressedIndex
        }
        //In contrast to the 'normal' reference (for which the index is chromosome based), this index is block-based
        //As such there is not need to make it a hash. An array is sufficient.
        this.compressedIndex = []
        const gziData = await igvxhr.loadArrayBuffer(this.compressedIndexFile, buildOptions(this.config))
        const givenFileSize = gziData.byteLength
        if (givenFileSize < GZI_NUM_BYTES_OFFSET) {
            console.log("Cannot parse GZI index file: length (" + givenFileSize + " bytes) is insufficient to determine content of index.")
            return this.compressedIndex
        }
        //First 8 bytes are a little endian unsigned bigint (64bit), indicating the number of blocks in the index.
        const numBlocksBuffer = gziData.slice(0, GZI_NUM_BYTES_OFFSET)
        const numBlocks = Number((new DataView(numBlocksBuffer)).getBigUint64(0, true))
        //The remainder of the gzi content are pairs of little endian unsigned bigint (64bit) numbers.
        //The first of the pair is the compressed position of a block
        //The second of the pair is the uncompressed position of a block

        //Sanity check:
        //Is the size of the array-buffer (of the entire file) correct with regards to the number of blocks detailled by the first 8 bytes of the file?
        //Total file-size should be:
        // 8 + 2*(num_entries*8) bytes, with the first 8 bytes indicating the number of entries
        const expectedFileSize = GZI_NUM_BYTES_OFFSET + numBlocks * 2 * GZI_NUM_BYTES_BLOCK
        if (givenFileSize != expectedFileSize) {
            console.log("Incorrect file size of reference genome index. Expected : " + expectedFileSize + ". Received : " + givenFileSize)
            return this.compressedIndex
        }

        //Push the first block to the index: the first block always has positions 0 for both the compressed and uncompressed file
        this.compressedIndex.push([0, 0])

        //Further process all the blocks of the GZI index, and keep them in memory
        for (let blockNumber = 0; blockNumber < numBlocks; blockNumber++) {
            const bufferBlockStart = GZI_NUM_BYTES_OFFSET + blockNumber * 2 * GZI_NUM_BYTES_BLOCK
            const bufferBlockEnd = GZI_NUM_BYTES_OFFSET + blockNumber * 2 * GZI_NUM_BYTES_BLOCK + 2 * GZI_NUM_BYTES_BLOCK
            const bufferBlock = gziData.slice(bufferBlockStart, bufferBlockEnd)
            const viewBlock = new DataView(bufferBlock)
            const compressedPosition = Number(viewBlock.getBigUint64(0, true))  //First 8 bytes
            const uncompressedPosition = Number(viewBlock.getBigUint64(GZI_NUM_BYTES_BLOCK, true)) //Last 8 bytes
            this.compressedIndex.push([compressedPosition, uncompressedPosition])
        }
        return this.compressedIndex
    }

    //The Fasta-index gives a byte-position of the chromosomal sequences within the FASTA file.
    //These locations need to be remapped to the locations within the zipped reference genome, using the GZI index
    //This function provides this functionality by 
    //1) taking the indicated start/stop byte locations within the UNCOMPRESSED FASTA file
    //2) remapping these byte locations to the correct blocks (and associated positions) within the COMPRESSED FASTA file
    //Subsequently, the calling method can then extract the correct blocks from the compressed FASTA files and uncompressed the data
    async getRelevantCompressedBlockNumbers(queryPositionStart, queryPositionEnd) {
        const COMPRESSED_POSITION = 0
        const UNCOMPRESSED_POSITION = 1
        //Fallback for impossible values
        if (queryPositionStart < 0 || queryPositionEnd < 0 || queryPositionEnd < queryPositionStart) {
            console.log("Incompatible query positions for reference-genome. Start:" + queryPositionStart + " | End:" + queryPositionEnd)
            return []
        }
        //Ensure compressed index is loaded
        await this.getCompressedIndex()
        let result = []
        //Now search for the correct block-numbers (going from 0 to length(compressed-index)) which overlap with the provided byte-positions
        const lowestBlockNumber = 0
        const highestBlockNumber = this.compressedIndex.length - 1
        //Failsafe if for some reason the compressed index wasn't loaded or doesn't contain any data
        if (this.compressedIndex.length == 0) {
            console.log("Compressed index does not contain any content")
            return []
        }
        //Failsafe: if the queryPositionStart is greater than the uncompressed-position of the final block,
        //then this final block is the only possible result
        if (queryPositionStart > (this.compressedIndex)[highestBlockNumber][UNCOMPRESSED_POSITION]) {
            return [highestBlockNumber]
        }

        //Rather than doing a linear search over all blocks, a binary search is done for speed considerations
        //We are searching for the highest block number for which its position is smaller than the query start position
        //Afterwards we will simply expand the blocks until the entire query range is covered
        let searchLow = lowestBlockNumber
        let searchHigh = highestBlockNumber
        let searchPosition = Math.floor(this.compressedIndex.length / 2)
        let maxIterations = this.compressedIndex.length + 1
        let solutionFound = false
        //instead of doing a while(true), this for-loop prevents eternal loops in case of issues
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            const searchUncompressedPosition = (this.compressedIndex)[searchPosition][UNCOMPRESSED_POSITION]
            const nextSearchUncompressedPosition = (searchPosition < (this.compressedIndex.length - 1)) ? (this.compressedIndex)[searchPosition + 1][UNCOMPRESSED_POSITION] : Infinity
            //The query position lies within the current search block
            if (searchUncompressedPosition <= queryPositionStart && nextSearchUncompressedPosition > queryPositionStart) {
                solutionFound = true
                break //searchPosition is the correct block number index
            }
            //Current block lies before the query position
            else if (searchUncompressedPosition < queryPositionStart) {
                searchLow = searchPosition + 1
            }
            //Current block lies after the query position
            else {
                searchHigh = searchPosition - 1
            }
            searchPosition = Math.ceil((searchHigh - searchLow) / 2) + searchLow
        }
        //If for some reason the binary search did not reveal a correct block index, then we return the empty result
        if (!solutionFound) {
            console.log("No blocks within compressed index found that correspond with query positions " + queryPositionStart + "," + queryPositionEnd)
            console.log(this.compressedIndex)
            return []
        }

        //Now extend the result by adding additional blocks until the entire query range is covered
        result.push(searchPosition)
        for (let blockIndex = searchPosition + 1; blockIndex < this.compressedIndex.length; blockIndex++) {
            result.push(blockIndex)
            const blockUncompressedPosition = (this.compressedIndex)[blockIndex][UNCOMPRESSED_POSITION]
            if (blockUncompressedPosition >= queryPositionEnd) {
                break
            }
        }

        //It is possible that the query end position lies AFTER the start of the final block
        //If this is the case, we add a 'fake' negative index which will be interpreted by the loadAndUncompressBlocks method as an indicator
        //to read until the end of the file 
        const finalRelevantBlock = result[result.length - 1]
        const finalIndexBlock = this.compressedIndex.length - 1
        if (finalRelevantBlock === finalIndexBlock && (this.compressedIndex)[finalRelevantBlock][UNCOMPRESSED_POSITION] < queryPositionEnd) {
            result.push(-1)
        }

        return result
    }


    //Load the content from the blockIndices.
    //This is done on a per-block basis
    //Content of the first block will be trimmed in order to match the expected offset
    async loadAndUncompressBlocks(blockIndices, startByte) {
        const COMPRESSED_POSITION = 0
        const UNCOMPRESSED_POSITION = 1
        //Normally the compressed index should already exist, we're just makeing sure here
        await this.getCompressedIndex()

        if (blockIndices.length == 0) {
            return ""
        }

        //Storing data in seperate array with indices in order to assert order due to async behaviour of loops
        let resultCache = Array(blockIndices.length - 1)
        for (let i = 0; i < blockIndices.length - 1; i++) {
            const currentBlockNumber = blockIndices[i]
            const currentBlockInfo = (this.compressedIndex)[currentBlockNumber]
            const currentBlockCompressedPosition = currentBlockInfo[COMPRESSED_POSITION]

            const nextBlockNumber = blockIndices[i + 1]
            let compressedBytes = []
            if (nextBlockNumber != -1) {  //default : read current entire block only
                const nextBlockInfo = (this.compressedIndex)[nextBlockNumber]
                const nextBlockCompressedPosition = nextBlockInfo[COMPRESSED_POSITION]
                const compressedLength = nextBlockCompressedPosition - currentBlockCompressedPosition
                compressedBytes = await igvxhr.loadArrayBuffer(this.file, buildOptions(this.config, {
                    range: {
                        start: currentBlockCompressedPosition,
                        size: compressedLength
                    }
                }))
            } else {   // special case for query within final block: read until the end of the file
                compressedBytes = await igvxhr.loadArrayBuffer(this.file, buildOptions(this.config, {
                    range: {
                        start: currentBlockCompressedPosition
                    }
                }))
            }
            //now unzip the compressed bytes, and store them in the resultCache
            const uncompressedBytes = await BGZip.unbgzf(compressedBytes)
            resultCache[i] = uncompressedBytes
        }

        //Iterate over the result cache, create sequences from the data, and create a full sequence string from the data
        let result = ""
        for (let i = 0; i < resultCache.length; i++) {
            for (let j = 0; j < resultCache[i].length; j++) {
                const c = String.fromCharCode(resultCache[i][j])
                result = result + c
            }
        }

        //postprocess this data: because entire blocks are read we need to remove the first N bases of the first used block, 
        //which are not included in the original query positions
        const firstBlockInfo = (this.compressedIndex)[blockIndices[0]]
        const offset = startByte - firstBlockInfo[UNCOMPRESSED_POSITION]
        result = result.substring(offset)

        return result
    }


    async readSequence(chr, qstart, qend) {

        await this.getIndex()
        await this.getCompressedIndex() //This will work even if no compressed index file is set

        const idxEntry = this.index[chr]
        if (!idxEntry) {
            console.log("No index entry for chr: " + chr)
            // Tag interval with null so we don't try again
            this.interval = new GenomicInterval(chr, qstart, qend, null)
            return null
        }

        const start = Math.max(0, qstart)    // qstart should never be < 0
        const end = Math.min(idxEntry.size, qend)
        const bytesPerLine = idxEntry.bytesPerLine
        const basesPerLine = idxEntry.basesPerLine
        const position = idxEntry.position
        const nEndBytes = bytesPerLine - basesPerLine
        const startLine = Math.floor(start / basesPerLine)
        const endLine = Math.floor(end / basesPerLine)
        const base0 = startLine * basesPerLine   // Base at beginning of start line
        const offset = start - base0
        const startByte = position + startLine * bytesPerLine + offset
        const base1 = endLine * basesPerLine
        const offset1 = end - base1
        const endByte = position + endLine * bytesPerLine + offset1 - 1
        const byteCount = endByte - startByte + 1

        if (byteCount <= 0) {
            console.error("No sequence for " + chr + ":" + qstart + "-" + qend)
            return null
        }

        //If the compressed index file is set, then we are dealing with a compressed genome sequence
        //The selection of startByte/endByte is done for the non-compressed genome sequence.
        //These need to be 'converted' to the correct byte positions in the compressed genome sequence,
        //by making use of the compressed index (GZI file)
        let allBytes
        if (!this.compressedIndexFile) {
            allBytes = await igvxhr.load(this.file, buildOptions(this.config, {
                range: {
                    start: startByte,
                    size: byteCount
                }
            }))
        } else {
            let relevantBlockIndices = await this.getRelevantCompressedBlockNumbers(startByte, endByte)
            if (relevantBlockIndices.length === 0) {
                console.log("No blocks in the compressed index that correspond with the requested byte positions (" + startByte + "," + endByte + ")")
                return null
            }
            allBytes = await this.loadAndUncompressBlocks(relevantBlockIndices, startByte)
        }

        if (!allBytes) {
            return null
        }

        let nBases,
            seqBytes = "",
            srcPos = 0,
            desPos = 0,
            allBytesLength = allBytes.length

        if (offset > 0) {
            nBases = Math.min(end - start, basesPerLine - offset)
            seqBytes += allBytes.substr(srcPos, nBases)
            srcPos += (nBases + nEndBytes)
            desPos += nBases
        }

        while (srcPos < allBytesLength) {
            nBases = Math.min(basesPerLine, allBytesLength - srcPos)
            seqBytes += allBytes.substr(srcPos, nBases)
            srcPos += (nBases + nEndBytes)
            desPos += nBases
        }

        return seqBytes

    }
}

export default FastaSequence


