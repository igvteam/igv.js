import FeatureTrack from "./feature/featureTrack";
import SequenceTrack from "./sequenceTrack";
import WigTrack from "./feature/wigTrack";
import SegTrack from "./feature/segTrack";
import MergedTrack from "./feature/mergedTrack";
import BAMTrack from "./bam/bamTrack";
import InteractionTrack from "./feature/interactionTrack";
import VariantTrack from "./variant/variantTrack";
import EqtlTrack from "./gtex/eqtlTrack";
import GWASTrack from "./gwas/gwasTrack";
import RnaStructTrack from "./rna/rnaStruct";

const TrackFactory = {
    'sequence': (config, browser) => {
        return new SequenceTrack(config, browser);
    },
    'feature': (config, browser) => {
        return new FeatureTrack(config, browser);
    },
    'seg': (config, browser) => {
        return new SegTrack(config, browser);
    },
    'wig': (config, browser) => {
        return new WigTrack(config, browser);
    },
    'merged': (config, browser) => {
        return new MergedTrack(config, browser);
    },
    'alignment': (config, browser) => {
        return new BAMTrack(config, browser);
    },
    'interaction': (config, browser) => {
        return new InteractionTrack(config, browser);
    },
    'variant': (config, browser) => {
        return new VariantTrack(config, browser);
    },
    'eqtl': (config, browser) => {
        return new EqtlTrack(config, browser);
    },
    'gwas': (config, browser) => {
        return new GWASTrack(config, browser);
    },
    'arc': (config, browser) => {
        return new RnaStructTrack(config, browser);
    }
}

export default TrackFactory;