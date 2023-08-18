/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
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
import PairedAlignment from "./pairedAlignment.js"
import {canBePaired, packAlignmentRows, pairAlignments, unpairAlignments} from "./alignmentUtils.js"
import {IGVMath} from "../../node_modules/igv-utils/src/index.js"
import BaseModificationCounts from "./mods/baseModificationCounts.js"


class AlignmentContainer {

    //            this.config.samplingWindowSize, this.config.samplingDepth,
    //             this.config.pairsSupported, this.config.alleleFreqThreshold)
    constructor(chr, start, end, {samplingWindowSize, samplingDepth, pairsSupported, alleleFreqThreshold, colorBy}) {

        this.chr = chr
        this.start = Math.floor(start)
        this.end = Math.ceil(end)
        this.length = (end - start)

        this.alleleFreqThreshold = alleleFreqThreshold === undefined ? 0.2 : alleleFreqThreshold

        this.coverageMap = new CoverageMap(chr, start, end, this.alleleFreqThreshold)
        this.alignments = []
        this.downsampledIntervals = []

        this.samplingWindowSize = samplingWindowSize === undefined ? 100 : samplingWindowSize
        this.samplingDepth = samplingDepth === undefined ? 1000 : samplingDepth

        this.pairsSupported = pairsSupported === undefined ? true : pairsSupported
        this.paired = false  // false until proven otherwise
        this.pairsCache = {}  // working cache of paired alignments by read name

        this.downsampledReads = new Set()

        this.currentBucket = new DownsampleBucket(this.start, this.start + this.samplingWindowSize, this)

        this.filter = function filter(alignment) {         // TODO -- pass this in
            return alignment.isMapped() && !alignment.isFailsVendorQualityCheck()
        }

        // Enable basemods
        if(colorBy && colorBy.startsWith("basemod")) {
            this.baseModCounts = new BaseModificationCounts()
        }
    }

    push(alignment) {

        if (this.filter(alignment) === false) return

        this.coverageMap.incCounts(alignment)   // Count coverage before any downsampling

        if (this.pairsSupported && this.downsampledReads.has(alignment.readName)) {
            return   // Mate already downsampled -- pairs are treated as a single alignment for downsampling
        }

        if (alignment.start >= this.currentBucket.end) {
            this.finishBucket()
            this.currentBucket = new DownsampleBucket(alignment.start, alignment.start + this.samplingWindowSize, this)
        }

        this.currentBucket.addAlignment(alignment)

        if(this.baseModCounts) {
            this.baseModCounts.incrementCounts(alignment)
        }

    }

    forEach(callback) {
        this.alignments.forEach(callback)
    }

    finish() {

        if (this.currentBucket !== undefined) {
            this.finishBucket()
        }

        this.alignments.sort(function (a, b) {
            return a.start - b.start
        })

        this.pairsCache = undefined
        this.downsampledReads = undefined

        if(this.baseModCounts) {
            this.baseModCounts.computeSimplex()
        }
    }

    contains(chr, start, end) {
        return this.chr === chr &&
            this.start <= start &&
            this.end >= end
    }

    hasDownsampledIntervals() {
        return this.downsampledIntervals && this.downsampledIntervals.length > 0
    }

    finishBucket() {
        this.alignments = this.alignments.concat(this.currentBucket.alignments)
        if (this.currentBucket.downsampledCount > 0) {
            this.downsampledIntervals.push(new DownsampledInterval(
                this.currentBucket.start,
                this.currentBucket.end,
                this.currentBucket.downsampledCount))
        }
        this.paired = this.paired || this.currentBucket.paired
    }

    setViewAsPairs(bool) {
        let alignments
        if (bool) {
            alignments = pairAlignments(this.packedAlignmentRows)
        } else {
            alignments = unpairAlignments(this.packedAlignmentRows)
        }
        this.packedAlignmentRows = packAlignmentRows(alignments, this.start, this.end)
    }

    setShowSoftClips(bool) {
        const alignments = this.allAlignments()
        this.packedAlignmentRows = packAlignmentRows(alignments, this.start, this.end, bool)
    }

    repack(bpPerPixel, showSoftClips) {
        const alignments = this.allAlignments()
        this.packedAlignmentRows = packAlignmentRows(alignments, this.start, this.end, showSoftClips, bpPerPixel)

    }

    allAlignments() {
        const alignments = []
        for (let row of this.packedAlignmentRows) {
            for (let alignment of row.alignments) {
                alignments.push(alignment)
            }
        }
        return alignments
    }

    getMax(start, end) {
        return this.coverageMap.getMax(start, end)
    }

    sortRows(options) {

        const newRows = []
        const undefinedRow = []
        for (let row of this.packedAlignmentRows) {
            const alignment = row.findAlignment(options.position, options.sortAsPairs)
            if (undefined !== alignment) {
                newRows.push(row)
            } else {
                undefinedRow.push(row)
            }
        }

        newRows.sort((rowA, rowB) => {
            const direction = options.direction
            const rowAValue = rowA.getSortValue(options, this)
            const rowBValue = rowB.getSortValue(options, this)

            if (rowBValue === undefined && rowBValue !== undefined) return 1
            else if (rowAValue !== undefined && rowBValue === undefined) return -1

            const i = rowAValue > rowBValue ? 1 : (rowAValue < rowBValue ? -1 : 0)
            return true === direction ? i : -i
        })

        for (let row of undefinedRow) {
            newRows.push(row)
        }

        this.packedAlignmentRows = newRows
    }

}


class DownsampleBucket {

    constructor(start, end, alignmentContainer) {

        this.start = start
        this.end = end
        this.alignments = []
        this.downsampledCount = 0
        this.samplingDepth = alignmentContainer.samplingDepth
        this.pairsSupported = alignmentContainer.pairsSupported
        this.downsampledReads = alignmentContainer.downsampledReads
        this.pairsCache = alignmentContainer.pairsCache
    }

    addAlignment(alignment) {

        var idx, replacedAlignment, pairedAlignment

        if (this.pairsSupported && canBePaired(alignment)) {
            pairedAlignment = this.pairsCache[alignment.readName]
            if (pairedAlignment) {
                // Not subject to downsampling, just update the existing alignment
                pairedAlignment.setSecondAlignment(alignment)
                this.pairsCache[alignment.readName] = undefined   // Don't need to track this anymore. NOTE: Don't "delete", causes runtime performance issues
                return
            }
        }

        if (this.alignments.length < this.samplingDepth) {

            if (this.pairsSupported && canBePaired(alignment)) {

                // First alignment in a pair
                pairedAlignment = new PairedAlignment(alignment)
                this.paired = true
                this.pairsCache[alignment.readName] = pairedAlignment
                this.alignments.push(pairedAlignment)

            } else {
                this.alignments.push(alignment)
            }

        } else {

            idx = Math.floor(Math.random() * (this.samplingDepth + this.downsampledCount - 1))

            if (idx < this.samplingDepth) {

                // Keep the new item
                //  idx = Math.floor(Math.random() * (this.alignments.length - 1));
                replacedAlignment = this.alignments[idx]   // To be replaced

                if (this.pairsSupported && canBePaired(alignment)) {

                    if (this.pairsCache[replacedAlignment.readName] !== undefined) {
                        this.pairsCache[replacedAlignment.readName] = undefined
                    }

                    pairedAlignment = new PairedAlignment(alignment)
                    this.paired = true
                    this.pairsCache[alignment.readName] = pairedAlignment
                    this.alignments[idx] = pairedAlignment

                } else {
                    this.alignments[idx] = alignment
                }
                this.downsampledReads.add(replacedAlignment.readName)

            } else {
                this.downsampledReads.add(alignment.readName)
            }

            this.downsampledCount++
        }


    }
}

class CoverageMap {

    constructor(chr, start, end, alleleFreqThreshold) {

        this.chr = chr
        this.bpStart = start
        this.length = (end - start)

        this.coverage = new Array(this.length)
        this.maximum = 0

        this.threshold = alleleFreqThreshold
        this.qualityWeight = true
    }

    /**
     * Return the maximum coverage value between start and end.  This is used for autoscaling.
     * @param start
     * @param end
     */
    getMax(start, end) {
        let max = 0
        const len = this.coverage.length
        for (let i = 0; i < len; i++) {
            const pos = this.bpStart + i
            if (pos > end) break
            const cov = this.coverage[i]
            if (pos >= start && cov) {
                max = Math.max(max, cov.total)
            }
        }
        return max
    }

    incCounts(alignment) {

        var self = this

        if (alignment.blocks === undefined) {
            incBlockCount(alignment)
        } else {
            alignment.blocks.forEach(function (block) {
                incBlockCount(block)
            })
        }

        if (alignment.gaps) {
            for (let del of alignment.gaps) {
                if (del.type === 'D') {
                    const offset = del.start - self.bpStart
                    for (let i = offset; i < offset + del.len; i++) {
                        if (i < 0) continue
                        if (!this.coverage[i]) {
                            this.coverage[i] = new Coverage(self.threshold)
                        }
                        this.coverage[i].del++
                    }
                }
            }
        }

        if (alignment.insertions) {
            for (let del of alignment.insertions) {
                const i = del.start - this.bpStart
                if (i < 0) continue
                if (!this.coverage[i]) {
                    this.coverage[i] = new Coverage(self.threshold)
                }
                this.coverage[i].ins++
            }
        }

        function incBlockCount(block) {

            if ('S' === block.type) return

            const seq = alignment.seq
            const qual = alignment.qual
            const seqOffset = block.seqOffset

            for (let i = block.start - self.bpStart, j = 0; j < block.len; i++, j++) {

                if (!self.coverage[i]) {
                    self.coverage[i] = new Coverage(self.threshold)
                }

                const base = (seq == undefined) ? "N" : seq.charAt(seqOffset + j)
                const key = (alignment.strand) ? "pos" + base : "neg" + base
                const q = qual && seqOffset + j < qual.length ? qual[seqOffset + j] : 30

                self.coverage[i][key] += 1
                self.coverage[i]["qual" + base] += q

                self.coverage[i].total += 1
                self.coverage[i].qual += q

                self.maximum = Math.max(self.coverage[i].total, self.maximum)

            }
        }
    }

    getPosCount(pos, base) {

        const offset = pos - this.bpStart
        if(offset < 0 || offset >= this.coverage.length) return 0
        const c = this.coverage[offset]

        switch(base) {
            case 'A':
            case 'a':
                return c.posA
            case 'C':
            case 'c':
                return c.posC
            case 'T':
            case 't':
                return c.posT
            case 'G':
            case 'g':
                return c.posG
            case 'N':
            case 'n':
                return c.posN
            default:
                return 0
        }
    }

    getNegCount(pos, base) {
        const offset = pos - this.bpStart
        if(offset < 0 || offset >= this.coverage.length) return 0
        const c = this.coverage[offset]

        switch(base) {
            case 'A':
            case 'a':
                return c.negA
            case 'C':
            case 'c':
                return c.negC
            case 'T':
            case 't':
                return c.negT
            case 'G':
            case 'g':
                return c.negG
            case 'N':
            case 'n':
                return c.negN
            default:
                return 0
        }

    }

    getCount(pos, base) {
        return this.getPosCount(pos, base) + this.getNegCount(pos, base)
    }

    getTotalCount(pos) {
        const offset = pos - this.bpStart
        return (offset >=0 && offset < this.coverage.length) ? this.coverage[offset].total : 0
    }
}


class Coverage {

    constructor(alleleThreshold) {

        this.qualityWeight = true

        this.posA = 0
        this.negA = 0

        this.posT = 0
        this.negT = 0

        this.posC = 0
        this.negC = 0
        this.posG = 0

        this.negG = 0

        this.posN = 0
        this.negN = 0

        this.pos = 0
        this.neg = 0

        this.qualA = 0
        this.qualT = 0
        this.qualC = 0
        this.qualG = 0
        this.qualN = 0

        this.qual = 0

        this.total = 0
        this.del = 0
        this.ins = 0

        this.threshold = alleleThreshold
    }

    hoverText() {
        const pos = this.posA + this.posT + this.posC + this.posG + this.posN
        const neg = this.negA + this.negT + this.negC + this.negG + this.negN
        return `${this.total} (${pos}+, ${neg}-)`
    }

    isMismatch(refBase) {
        const threshold = this.threshold * ((this.qualityWeight && this.qual) ? this.qual : this.total)
        let mismatchQualitySum = 0
        for (let base of ["A", "T", "C", "G"]) {
            if (base !== refBase) {
                mismatchQualitySum += ((this.qualityWeight && this.qual) ? this["qual" + base] : (this["pos" + base] + this["neg" + base]))
            }
        }
        return mismatchQualitySum >= threshold
    }
}

class DownsampledInterval {

    constructor(start, end, counts) {
        this.start = start
        this.end = end
        this.counts = counts
    }

    popupData(genomicLocation) {
        return [
            {name: "start", value: this.start + 1},
            {name: "end", value: this.end},
            {name: "# downsampled:", value: this.counts}]
    }
}

export default AlignmentContainer