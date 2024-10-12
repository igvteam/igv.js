import FeatureTrack from "./feature/featureTrack.js"
import SequenceTrack from "./sequenceTrack.js"
import WigTrack from "./feature/wigTrack.js"
import SegTrack from "./feature/segTrack.js"
import MergedTrack from "./feature/mergedTrack.js"
import BAMTrack from "./bam/bamTrack.js"
import InteractionTrack from "./feature/interactionTrack.js"
import VariantTrack from "./variant/variantTrack.js"
import QTLTrack from "./qtl/qtlTrack.js"
import GWASTrack from "./gwas/gwasTrack.js"
import GCNVTrack from "./gcnv/gcnvTrack.js"
import RnaStructTrack from "./rna/rnaStruct.js"
import IdeogramTrack from "./ideogramTrack.js"
import SpliceJunctionTrack from "./feature/spliceJunctionTrack.js"
import BlatTrack from "./blat/blatTrack.js"
import CNVPytorTrack from "./cnvpytor/cnvpytorTrack.js"
import ShoeboxTrack from "./shoebox/shoeboxTrack.js"
//import CNVPytorTrack from "./CNVpytor/cnvpytorTrack.js"


const trackFunctions =
    new Map([
        ['ideogram', (config, browser) => new IdeogramTrack(config, browser)],
        ['sequence', (config, browser) => new SequenceTrack(config, browser)],
        ['feature', (config, browser) => new FeatureTrack(config, browser)],
        ['seg', (config, browser) => new SegTrack(config, browser)],
        ['mut', (config, browser) => new SegTrack(config, browser)],
        ['maf', (config, browser) => new SegTrack(config, browser)],
        ['shoebox', (config, browser) => new ShoeboxTrack(config, browser)],
        ['wig', (config, browser) => new WigTrack(config, browser)],
        ['merged', (config, browser) => new MergedTrack(config, browser)],
        ['alignment', (config, browser) => new BAMTrack(config, browser)],
        ['interaction', (config, browser) => new InteractionTrack(config, browser)],
        ['interact', (config, browser) => new InteractionTrack(config, browser)],
        ['variant', (config, browser) => new VariantTrack(config, browser)],
        ['qtl', (config, browser) => new QTLTrack(config, browser)],
        ['eqtl', (config, browser) => new QTLTrack(config, browser)],
        ['gwas', (config, browser) => new GWASTrack(config, browser)],
        ['arc', (config, browser) => new RnaStructTrack(config, browser)],
        ['gcnv', (config, browser) => new GCNVTrack(config, browser)],
        ['junction', (config, browser) => new SpliceJunctionTrack(config, browser)],
        ['blat', (config, browser) => new BlatTrack(config, browser)],
        ['cnvpytor', (config, browser) => new CNVPytorTrack(config, browser)]
    ])


/**
 * Return a track of the given type, passing configuration and a point to the IGV "Browser" object to its constructor function*
 * @param type -- track type (string)
 * @param config -- track configuration object
 * @param browser -- the IGV "Browser" object
 * @returns {IdeogramTrack|undefined}
 */
function getTrack (type, config, browser) {

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

/**
 * Add a track creator function to the factory lookup table.  Legacy function, superceded by registerTrackClass.
 *
 * @param type
 * @param track
 */
function registerTrackClass(type, trackClass) {
    trackFunctions.set(type, (config, browser) => new trackClass(config, browser))
}



function registerTrackCreatorFunction (type, track) {
    trackFunctions.set(type, track)
}

export {
    getTrack,
    trackFunctions,
    registerTrackClass,
    registerTrackCreatorFunction
}
