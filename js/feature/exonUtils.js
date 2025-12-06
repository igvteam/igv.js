import {translationDict} from "../sequenceTrack.js"
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
    if(exon.utr) return 0
    const start = exon.cdStart || exon.start
    const end = exon.cdEnd || exon.end
    return end - start
}


export { getExonPhase, getCodingStart, getCodingEnd, getCodingLength }
