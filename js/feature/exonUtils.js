import {translationDict} from "../util/translationDict.js"
import {complementSequence} from "../util/sequenceUtils.js"

function getExonPhase(exon) {
    return (3 - exon.readingFrame) % 3
}

function getCodingStart(exon) {
    return exon.cdStart || exon.start
}

function getCodingEnd(exon) {
    return exon.cdEnd || exon.end
}

function getCodingLength(exon) {
    if (exon.utr) return 0
    const start = exon.cdStart || exon.start
    const end = exon.cdEnd || exon.end
    return end - start
}


/**
 * Mark the exons of a feature with a defined coding region (cdStart & cdEnd) as coding, non-coding (utr), or
 * partially coding, in which case the coding start and/or end of the individual exon is recorded.
 *
 * @param exons
 * @param cdStart
 * @param cdEnd
 */
function findUTRs(exons, cdStart, cdEnd) {

    for (let exon of exons) {
        const end = exon.end
        const start = exon.start
        if (end < cdStart || start > cdEnd) {
            exon.utr = true
        } else {
            if (cdStart >= start && cdStart <= end) {
                exon.cdStart = cdStart
            }
            if (cdEnd >= start && cdEnd <= end) {
                exon.cdEnd = cdEnd
            }
        }
    }
}

/**
 * Create implicit exons for a feature with a defined coding region (cdStart & cdEnd, bed columns 7-8) but no
 * explicitly defined exons (columns 10-12).  The coding start and end divide the feature into up to 3 blocks --
 * a non-coding (UTR) start, a coding middle, and a non-coding end.
 *
 * Returns undefined if the coding region is not defined, is not contained within the feature, or spans the
 * entire feature, in which cases implicit exons are not needed.
 *
 * @param feature
 * @returns {[{start: number, end: number, utr: boolean|undefined}]|undefined}
 */
function createImplicitExons(feature) {

    const {start, end, cdStart, cdEnd} = feature

    if (cdStart === undefined || cdEnd === undefined || isNaN(cdStart) || isNaN(cdEnd) ||
        cdStart < start || cdEnd > end || cdStart > cdEnd) {
        return undefined
    }

    if (cdStart === start && cdEnd === end) {
        return undefined                     // Feature is entirely coding
    }

    if (cdStart === cdEnd) {
        return [{start, end, utr: true}]     // Feature is entirely non-coding
    }

    const exons = []
    if (cdStart > start) {
        exons.push({start: start, end: cdStart, utr: true})
    }
    exons.push({start: cdStart, end: cdEnd})
    if (cdEnd < end) {
        exons.push({start: cdEnd, end: end, utr: true})
    }
    return exons
}


export { getExonPhase, getCodingStart, getCodingEnd, getCodingLength, findUTRs, createImplicitExons }
