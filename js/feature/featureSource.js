import TextFeatureSource from "./textFeatureSource.js"
import BWSource from "../bigwig/bwSource.js"
import TDFSource from "../tdf/tdfSource.js"
import StaticFeatureSource from "./staticFeatureSource.js"
import GenbankFeatureSource from "../gbk/genbankFeatureSource.js"
import ListFeatureSource from "./listFeatureSource.js"
import HicSource from "../hic/hicSource.js"

const bbFormats = new Set(['bigwig', 'bw', 'bigbed', 'bb', 'biginteract', 'biggenepred', 'bignarrowpeak'])

function FeatureSource(config, genome) {

    const format = config.format ? config.format.toLowerCase() : undefined

    if (config.features) {
        return new StaticFeatureSource(config, genome)
    } else if (bbFormats.has(format)) {
        return new BWSource(config, genome)
    } else if ("tdf" === format) {
        return new TDFSource(config, genome)
    } else if ("gbk" === format) {
        return new GenbankFeatureSource(config, genome)
    } else if ("vcf.list" === format) {
        // This is a text file with two columns:   <chr>  <url to vcf>
        return new ListFeatureSource(config, genome)
    } else if ("hic" === format) {
        return new HicSource(config, genome)
    } else {
        return new TextFeatureSource(config, genome)
    }
}

export default FeatureSource
