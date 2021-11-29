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
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import GenomicInterval from "./genomicInterval.js"
import Chromosome from "./chromosome.js"
import {buildOptions} from "../util/igvUtils.js"

const splitLines = StringUtils.splitLines

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed'])

class FastaSequence {

    constructor(reference) {

        this.file = reference.fastaURL
        this.indexFile = reference.indexURL || reference.indexFile || this.file + ".fai"
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

        if (!(this.interval && this.interval.contains(chr, start, end))) {

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
                    this.chromosomes[chr] = new Chromosome(chr, order++, 0, size)
                }
            }
            return this.index
        }
    }

    async readSequence(chr, qstart, qend) {

        // let offset;
        // let start;
        // let end;
        // let basesPerLine;
        // let nEndBytes;

        await this.getIndex()

        const idxEntry = this.index[chr]
        if (!idxEntry) {
            console.log("No index entry for chr: " + chr)

            // Tag interval with null so we don't try again
            this.interval = new GenomicInterval(chr, qstart, qend, null)
            return null

        } else {

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

            let allBytes
            if (byteCount <= 0) {
                console.error("No sequence for " + chr + ":" + qstart + "-" + qend)
            } else {
                allBytes = await igvxhr.load(this.file, buildOptions(this.config, {
                    range: {
                        start: startByte,
                        size: byteCount
                    }
                }))
            }

            if (!allBytes) {
                return null
            } else {
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
    }
}

export default FastaSequence


