import {translationDict} from "../sequenceTrack.js"
import {complementSequence} from "../util/sequenceUtils.js"

function getExonPhase(exon) {
    return (3 - exon.readingFrame) % 3
}

function getEonStart(exon) {
    return exon.cdStart || exon.start
}

function getExonEnd(exon) {
    return exon.cdEnd || exon.end
}


export { getExonPhase, getEonStart, getExonEnd }
