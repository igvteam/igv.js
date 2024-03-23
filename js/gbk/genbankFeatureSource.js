import {loadGenbank} from "./genbankParser.js"
import StaticFeatureSource from "../feature/staticFeatureSource.js"

class GenbankFeatureSource {

    constructor(config) {
        this.config = config
        this.searchable = true
    }

    // Feature source interface
    async getFeatures({chr, start, end, bpPerPixel, visibilityWindow}) {
        if(!this.featureSource) {
            const gbk = await loadGenbank(this.config.url)
            this.featureSource = new StaticFeatureSource({
                genome: this.config.genome,
                features: gbk.features,
                searchableFields: ['gene', 'db_xref', 'locus_tag', 'transcript_id']
            })

        }
        return this.featureSource.getFeatures({chr, start, end})
    }
    supportsWholeGenome() {
        return false
    }

    search(term) {
        return this.featureSource.search(term)
    }
}

export default GenbankFeatureSource