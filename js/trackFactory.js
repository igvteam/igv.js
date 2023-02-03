import FeatureTrack from "./feature/featureTrack.js"
import SequenceTrack from "./sequenceTrack.js"
import WigTrack from "./feature/wigTrack.js"
import SegTrack from "./feature/segTrack.js"
import MergedTrack from "./feature/mergedTrack.js"
import BAMTrack from "./bam/bamTrack.js"
import InteractionTrack from "./feature/interactionTrack.js"
import VariantTrack from "./variant/variantTrack.js"
import EqtlTrack from "./gtex/eqtlTrack.js"
import GWASTrack from "./gwas/gwasTrack.js"
import GCNVTrack from "./gcnv/gcnvTrack.js"
import RnaStructTrack from "./rna/rnaStruct.js"
import IdeogramTrack from "./ideogramTrack.js"
import SpliceJunctionTrack from "./feature/spliceJunctionTrack.js"
import BlatTrack from "./blat/blatTrack.js"
import cnvpytorTrack from "./CNVpytor/cnvpytorTrack.js"


const trackFunctions =
    new Map([
        ['ideogram', (config, browser) => new IdeogramTrack(config, browser)],
        ['sequence', (config, browser) => new SequenceTrack(config, browser)],
        ['feature', (config, browser) => new FeatureTrack(config, browser)],
        ['seg', (config, browser) => new SegTrack(config, browser)],
        ['mut', (config, browser) => new SegTrack(config, browser)],
        ['maf', (config, browser) => new SegTrack(config, browser)],
        ['wig', (config, browser) => new WigTrack(config, browser)],
        ['merged', (config, browser) => new MergedTrack(config, browser)],
        ['alignment', (config, browser) => new BAMTrack(config, browser)],
        ['interaction', (config, browser) => new InteractionTrack(config, browser)],
        ['interact', (config, browser) => new InteractionTrack(config, browser)],
        ['variant', (config, browser) => new VariantTrack(config, browser)],
        ['eqtl', (config, browser) => new EqtlTrack(config, browser)],
        ['gwas', (config, browser) => new GWASTrack(config, browser)],
        ['arc', (config, browser) => new RnaStructTrack(config, browser)],
        ['gcnv', (config, browser) => new GCNVTrack(config, browser)],
        ['junction', (config, browser) => new SpliceJunctionTrack(config, browser)],
        ['blat', (config, browser) => new BlatTrack(config, browser)],
        ['cnvpytor', (config, browser) => new cnvpytorTrack(config, browser)],
    ])


/**
 * Add a track constructor  the the factory lookup table.
 *
 * @param type
 * @param track
 */
const addTrackCreatorFunction = function (type, track) {
    trackFunctions.set(type, track)
}

const getTrack = function (type, config, browser) {

    let trackKey
    switch (type) {
        case "annotation":
        case "genes":
        case "fusionjuncspan":
        case "snp":
            trackKey = "feature"
            break
        case 'seg':
        case 'maf':
        case 'mut':
            trackKey = 'seg'
            break
        case 'junctions':
        case 'splicejunctions':
            trackKey = 'junction'
            break
        default:
            trackKey = type
    }

    return trackFunctions.has(trackKey) ?
        trackFunctions.get(trackKey)(config, browser) :
        undefined
}

export default {
    tracks: trackFunctions,
    addTrack: addTrackCreatorFunction,
    getTrack
}
