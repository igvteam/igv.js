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

import {StringUtils} from "../../node_modules/igv-utils/src/index.js"

const isString = StringUtils.isString
const hashCode = StringUtils.hashCode

class BamAlignmentRow {

    constructor() {

        this.alignments = []
        this.score = undefined
    }

    findAlignment(genomicLocation) {

        const alignmentContains = (a, genomicLocation) => {
            return genomicLocation >= a.start && genomicLocation < a.start + a.lengthOnRef
        }

        // find single alignment that overlaps sort location
        let centerAlignment
        for (let i = 0; i < this.alignments.length; i++) {
            const a = this.alignments[i]
            if (genomicLocation >= a.start && genomicLocation < a.start + a.lengthOnRef) {
                if (a.paired) {
                    if (a.firstAlignment && alignmentContains(a.firstAlignment, genomicLocation)) {
                        centerAlignment = a.firstAlignment
                    } else if (a.secondAlignment && alignmentContains(a.secondAlignment, genomicLocation)) {
                        centerAlignment = a.secondAlignment
                    }
                } else {
                    centerAlignment = a
                }
                break
            }
        }

        return centerAlignment

    }

    updateScore(options, alignmentContainer) {
        this.score = this.calculateScore(options, alignmentContainer)
    }

    calculateScore({position, option, direction, tag}, alignmentContainer) {

        if (!option) option = "BASE"

        const alignment = this.findAlignment(position)
        if (undefined === alignment) {
            return Number.MAX_VALUE * (direction ? 1 : -1)
        }

        let mate
        switch (option) {
            case "NUCLEOTIDE":
            case "BASE": {
                return calculateBaseScore(alignment, alignmentContainer, position)
            }
            case "STRAND":
                return alignment.strand ? 1 : -1
            case "START":
                return alignment.start
            case "TAG": {

                const tagValue = alignment.tags()[tag]
                if (tagValue !== undefined) {
                    return isString(tagValue) ? hashCode(tagValue) : tagValue
                } else {
                    return Number.MAX_VALUE
                }
            }
            case "READ_NAME":
                return hashCode(alignment.readName)
            case "INSERT_SIZE":
                return -Math.abs(alignment.tlen)
            case "GAP_SIZE":
                return -alignment.gapSizeAt(position)
            case "MATE_CHR":
                mate = alignment.mate
                if (!mate) {
                    return Number.MAX_VALUE
                } else {
                    if (mate.chr === alignment.chr) {
                        return Number.MAX_VALUE - 1
                    } else {
                        return hashCode(mate.chr)
                    }
                }
            case "MQ":
                return alignment.mq === undefined ? Number.MAX_VALUE : -alignment.mq
            default:
                return Number.MAX_VALUE
        }


        function calculateBaseScore(alignment, alignmentContainer, genomicLocation) {

            let reference
            const idx = Math.floor(genomicLocation) - alignmentContainer.start
            if (idx < alignmentContainer.sequence.length) {
                reference = alignmentContainer.sequence.charAt(idx)
            }
            if (!reference) {
                return 0
            }
            const base = alignment.readBaseAt(genomicLocation)
            const quality = alignment.readBaseQualityAt(genomicLocation)

            const coverageMap = alignmentContainer.coverageMap
            const coverageMapIndex = Math.floor(genomicLocation - coverageMap.bpStart)
            const coverage = coverageMap.coverage[coverageMapIndex]

            // Insertions.  These are additive with base scores as they occur between bases, so you can have a
            // base mismatch AND an insertion
            let baseScore = 0
            if (alignment.insertions) {
                for (let ins of alignment.insertions) {
                    if (ins.start === genomicLocation) {
                        baseScore = -coverage.ins
                    }
                }
            }


            if (!base) {
                // Either deletion or skipped (splice junction)
                const delCount = coverage.del
                if (delCount > 0) {
                    baseScore -= delCount
                } else if (baseScore === 0) {    // Don't modify insertion score, if any
                    baseScore = 1
                }
            } else {
                reference = reference.toUpperCase()
                if ('N' === base && baseScore === 0) {
                    baseScore = 2
                } else if ((reference === base || '=' === base) && baseScore === 0) {
                    baseScore = 4 - quality / 1000
                } else if ("X" === base || reference !== base) {
                    const count = coverage["pos" + base] + coverage["neg" + base]
                    baseScore -= (count + (quality / 1000))
                }
            }


            return baseScore
        }
    }
}

export default BamAlignmentRow
