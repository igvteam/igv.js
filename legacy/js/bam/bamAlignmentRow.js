import { StringUtils } from "../../node_modules/igv-utils/src/index.js"

const isString = StringUtils.isString
const hashCode = StringUtils.hashCode

class BamAlignmentRow {

    constructor() {

        this.alignments = []
        this.score = undefined
    }

    findAlignment(genomicLocation, sortAsPairs = false) {

        const alignmentContains = (a, genomicLocation) => {
            return genomicLocation >= a.start && genomicLocation < a.start + (sortAsPairs ? a.fragmentLength : a.lengthOnRef)
        }

        // find single alignment that overlaps sort location
        let centerAlignment
        for (let i = 0; i < this.alignments.length; i++) {
            const a = this.alignments[i]
            if (genomicLocation >= a.start && genomicLocation < a.start + (sortAsPairs ? a.fragmentLength : a.lengthOnRef)) {
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

    getSortValue({ position, option, tag, sortAsPairs }, alignmentContainer) {

        if (!option) option = "BASE"

        const alignment = this.findAlignment(position, sortAsPairs)
        if (undefined === alignment) {  // This condition should never occur
            return Number.MAX_VALUE
        }

        switch (option) {
            case "NUCLEOTIDE":
            case "BASE": {
                return calculateBaseScore(alignment, alignmentContainer, position)
            }
            case "strand":
                return alignment.strand ? 1 : -1
            case "START":
                return alignment.start
            case "TAG": {
                return alignment.tags()[tag]
            }
            case "READ_NAME":
                return alignment.readName
            case "INSERT_SIZE":
                return -Math.abs(alignment.fragmentLength)
            case "GAP_SIZE":
                return -alignment.gapSizeAt(position)
            case "MATE_CHR":
                return alignment.mate ? alignment.mate.chr : Number.MAX_VALUE
            case "MQ":
                return alignment.mq === undefined ? Number.MAX_VALUE : -alignment.mq
            case "ALIGNED_READ_LENGTH":
                return -alignment.lengthOnRef
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
