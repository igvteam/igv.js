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
import BaseModificationCounts from "./mods/baseModificationCounts.js"
import BamAlignmentRow from "./bamAlignmentRow.js"
import orientationTypes from "./orientationTypes.js"
import {isNumber} from "../util/igvUtils.js"

const alignmentSpace = 2


/**
 * AlignmentContainer contains alignments for a genomic region and manages downsampling,  packing into rows,
 * as well as computation of coverage and base modification counts.   Coverage and base modification counts are
 * calculated prior to downsampling.  After initialization an AlignmentContainer exposes 3 properties used
 * by BamTrack
 *    - coverageMap
 *    - sequence
 *    - packedAlignments
 */
class AlignmentContainer {

    constructor(chr, start, end,
                {
                    samplingWindowSize,
                    samplingDepth,
                    alleleFreqThreshold,
                    colorBy,
                    filter
                }) {

        this.chr = chr
        this.start = Math.floor(start)
        this.end = Math.ceil(end)
        this.length = (end - start)
        this.coverageMap = new CoverageMap(chr, start, end, this.alleleFreqThreshold)
        this.downsampledIntervals = []

        this.alleleFreqThreshold = alleleFreqThreshold === undefined ? 0.2 : alleleFreqThreshold
        this.samplingWindowSize = samplingWindowSize || 100
        this.samplingDepth = samplingDepth || 1000
        this.paired = false  // false until proven otherwise

        this.filter = filter || ((alignment) => {
            return alignment.isMapped() && !alignment.isFailsVendorQualityCheck()
        })

        // Enable basemods
        if (colorBy && colorBy.startsWith("basemod")) {
            this.baseModCounts = new BaseModificationCounts()
        }

        // Transient members -- used during downsampling and prior to packing
        this.alignments = []
        this.pairsCache = {}  // working cache of paired alignments by read name
        this.downsampledReads = new Set()
        this.currentBucket = new DownsampleBucket(this.start, this.start + this.samplingWindowSize, this)
    }

    pack({viewAsPairs, showSoftClips, expectedPairOrientation, groupBy}) {

        let alignments = this.allAlignments()
        if (viewAsPairs) {
            alignments = pairAlignments(alignments)
        } else {
            alignments = unpairAlignments(alignments)
        }
        this.packedGroups = packAlignmentRows(alignments, showSoftClips, expectedPairOrientation, groupBy)
        if (this.alignments) {
            delete this.alignments
        }
    }

    push(alignment) {

        if (this.filter(alignment) === false) return

        this.coverageMap.incCounts(alignment)   // Count coverage before any downsampling

        if (this.baseModCounts) {
            this.baseModCounts.incrementCounts(alignment)
        }

        if (this.downsampledReads.has(alignment.readName)) {
            return   // Mate already downsampled -- pairs and chimeric alignments are treated as a single alignment for downsampling
        }

        if (alignment.start >= this.currentBucket.end) {
            this.finishBucket()
            this.paired = this.paired || this.currentBucket.paired
            this.currentBucket = new DownsampleBucket(alignment.start, alignment.start + this.samplingWindowSize, this)
        }

        this.currentBucket.addAlignment(alignment)

    }

    finish() {

        if (this.currentBucket !== undefined) {
            this.finishBucket()
        }

        this.hasAlignments = this.alignments.length > 0

        this.alignments.sort(function (a, b) {
            return a.start - b.start
        })

        if (this.baseModCounts) {
            this.baseModCounts.computeSimplex()
        }

        delete this.currentBucket
        delete this.pairsCache
        delete this.downsampledReads

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

    allAlignments() {
        if (this.alignments) {
            return this.alignments
        } else {
            return Array.from(this.packedGroups.values()).flatMap(group => group.rows.flatMap(row => row.alignments))
        }
    }

    getMax(start, end) {
        return this.coverageMap.getMax(start, end)
    }

    sortRows(options) {

        for (let group of this.packedGroups.values()) {
            group.sortRows(options, this)
        }
    }
}


class DownsampleBucket {

    constructor(start, end, {samplingDepth, downsampledReads, pairsCache}) {

        this.start = start
        this.end = end
        this.alignments = []
        this.downsampledCount = 0
        this.samplingDepth = samplingDepth
        this.downsampledReads = downsampledReads
        this.pairsCache = pairsCache
        this.paired = false  // Until proven otherwise
    }

    addAlignment(alignment) {

        var idx, replacedAlignment, pairedAlignment

        if (canBePaired(alignment)) {
            pairedAlignment = this.pairsCache[alignment.readName]
            if (pairedAlignment) {
                // Not subject to downsampling, just update the existing alignment
                pairedAlignment.setSecondAlignment(alignment)
                this.pairsCache[alignment.readName] = undefined   // Don't need to track this anymore. NOTE: Don't "delete", causes runtime performance issues
                return
            }
        }

        if (this.alignments.length < this.samplingDepth) {

            if (canBePaired(alignment)) {

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

                if (canBePaired(alignment)) {

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
        if (offset < 0 || offset >= this.coverage.length) return 0
        const c = this.coverage[offset]

        switch (base) {
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
        if (offset < 0 || offset >= this.coverage.length) return 0
        const c = this.coverage[offset]

        switch (base) {
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
        return (offset >= 0 && offset < this.coverage.length) ? this.coverage[offset].total : 0
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

class Group {

    pixelTop = 0
    pixelBottom = 0
    rows = []


    constructor(name) {
        this.name = this.name
    }

    push(row) {
        this.rows.push(row)
    }

    get length() {
        return this.rows.length
    }

    sortRows(options, alignmentContainer) {

        const newRows = []
        const undefinedRow = []
        for (let row of this.rows) {
            const alignment = row.findAlignment(options.position, options.sortAsPairs)
            if (undefined !== alignment) {
                newRows.push(row)
            } else {
                undefinedRow.push(row)
            }
        }


        newRows.sort((rowA, rowB) => {
            const direction = options.direction
            const rowAValue = rowA.getSortValue(options, alignmentContainer)
            const rowBValue = rowB.getSortValue(options, alignmentContainer)

            if (rowBValue === undefined && rowBValue !== undefined) return 1
            else if (rowAValue !== undefined && rowBValue === undefined) return -1

            const i = rowAValue > rowBValue ? 1 : (rowAValue < rowBValue ? -1 : 0)
            return true === direction ? i : -i
        })

        for (let row of undefinedRow) {
            newRows.push(row)
        }

        this.rows = newRows

    }

}


function canBePaired(alignment) {
    return alignment.isPaired() &&
        alignment.mate &&
        alignment.isMateMapped() &&
        alignment.chr === alignment.mate.chr &&
        (alignment.isFirstOfPair() || alignment.isSecondOfPair()) && !(alignment.isSecondary() || alignment.isSupplementary())
}


function pairAlignments(alignments) {

    const pairCache = new Map()
    const result = alignments.map(alignment => {
        if (canBePaired(alignment)) {
            let pairedAlignment = pairCache.get(alignment.readName)
            if (pairedAlignment) {
                pairedAlignment.setSecondAlignment(alignment)
                pairCache.delete(alignment.readName)
                return pairedAlignment
            } else {
                pairedAlignment = new PairedAlignment(alignment)
                pairCache.set(alignment.readName, pairedAlignment)
                return pairedAlignment
            }
        } else {
            return alignment
        }
    })
    return result
}

function unpairAlignments(alignments) {
    return alignments.flatMap(alignment => alignment instanceof PairedAlignment ?
        [alignment.firstAlignment, alignment.secondAlignment].filter(Boolean) :
        [alignment])
}

function packAlignmentRows(alignments, showSoftClips, expectedPairOrientation, groupBy) {

    if (!alignments || alignments.length === 0) {
        return new Map()
    } else {

        // Separate alignments into groups
        const groupedAlignments = new Map()
        if (groupBy) {
            let tag
            if (groupBy.startsWith("tag:")) {
                tag = groupBy.substring(4)
                groupBy = "tag"
            }
            for (let a of alignments) {
                const group = getGroupValue(a, groupBy, tag, expectedPairOrientation) || ""
                if (!groupedAlignments.has(group)) {
                    groupedAlignments.set(group, [])
                }
                groupedAlignments.get(group).push(a)
            }
        } else {
            groupedAlignments.set("", alignments)
        }

        const packed = new Map()
        const orderedGroupNames = Array.from(groupedAlignments.keys()).sort("pairOrientation" === groupBy ?
            pairOrientationComparator(expectedPairOrientation) : groupNameComparator)
        for (let groupName of orderedGroupNames) {

            let alignments = groupedAlignments.get(groupName)

            alignments.sort(function (a, b) {
                return showSoftClips ? a.scStart - b.scStart : a.start - b.start
            })

            const group = new Group(groupName)
            packed.set(groupName, group)
            let alignmentRow
            let nextStart = 0
            let nextIDX = 0
            const allocated = new Set()
            const startNewRow = () => {
                alignmentRow = new BamAlignmentRow()
                group.push(alignmentRow)
                nextStart = 0
                nextIDX = 0
                allocated.clear()
            }
            startNewRow()

            while (alignments.length > 0) {
                if (nextIDX >= 0 && nextIDX < alignments.length) {
                    const alignment = alignments[nextIDX]
                    allocated.add(alignment)
                    alignmentRow.alignments.push(alignment)
                    nextStart = showSoftClips ?
                        alignment.scStart + alignment.scLengthOnRef + alignmentSpace :
                        alignment.start + alignment.lengthOnRef + alignmentSpace
                    nextIDX = binarySearch(alignments, (a) => (showSoftClips ? a.scStart : a.start) > nextStart, nextIDX)
                } else {
                    // Remove allocated alignments and start new row
                    alignments = alignments.filter(a => !allocated.has(a))
                    startNewRow()
                }
            }
        }
        //console.log(`Done in ${Date.now() - t0} ms`)
        return packed
    }
}

/**
 * Return 0 <= i <= array.length such that !pred(array[i - 1]) && pred(array[i]).
 *
 * returns an index 0 ≤ i ≤ array.length such that the given predicate is false for array[i - 1] and true for array[i]* *
 */
function binarySearch(array, pred, min) {
    let lo = min - 1, hi = array.length
    while (1 + lo < hi) {
        const mi = lo + ((hi - lo) >> 1)
        if (pred(array[mi])) {
            hi = mi
        } else {
            lo = mi
        }
    }
    return hi
}

function getGroupValue(al, groupBy, tag, expectedPairOrientation) {

    switch (groupBy) {
        // case 'HAPLOTYPE':
        //     return al.getHaplotypeName();
        case 'strand':
            return al.strand ? '+' : '-'
        case 'firstOfPairStrand':
            const strand = al.firstOfPairStrand
            return strand === undefined ? "" : strand ? '+' : '-'
        case 'mateChr':
            return (al.mate && al.isMateMapped()) ? al.mate.chr : ""
        case 'pairOrientation':
            return orientationTypes[expectedPairOrientation][al.pairOrientation] || ""
        case 'chimeric':
            return al.tags()['SA'] ? "chimeric" : ""
        case 'supplementary':
            return al.isSupplementary ? "supplementary" : ""
        case 'readOrder':
            if (al.isPaired() && al.isFirstOfPair()) {
                return "first"
            } else if (al.isPaired() && al.isSecondOfPair()) {
                return "second"
            } else {
                return ""
            }
        case 'phase':
            return al.tags()['HP'] || ""
        case 'tag':
            return al.tags()[tag] || ""
        // Add cases for other options as needed
        default:
            return undefined
    }
}


function groupNameComparator(o1, o2) {
    if (!o1 && !o2) {
        return 0
    } else if (!o1) {
        return 1
    } else if (!o2) {
        return -1
    } else {
        // no nulls
        if (o1 === o2) {
            return 0
        } else {
            if (isNumber(o1) && typeof isNumber(o2)) {
                return Number.parseFloat(o1) - Number.parseFloat(o2)
            } else {
                let s1 = o1.toString()
                let s2 = o2.toString()
                return s1.localeCompare(s2, undefined, {sensitivity: 'base'})
            }
        }
    }
}

function pairOrientationComparator(expectedPairOrientation) {
    const orientationValues = ['LL', 'RR', 'RL', 'LR', '']
    return (o1, o2) => orientationValues.indexOf(o1) - orientationValues.indexOf(o2)
}


export default AlignmentContainer