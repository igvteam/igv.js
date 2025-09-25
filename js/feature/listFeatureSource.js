import BaseFeatureSource from "./baseFeatureSource.js"
import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"
import getDataWrapper from "./dataWrapper.js"
import FeatureSource from "./featureSource.js"

class ListFeatureSource extends BaseFeatureSource {

    constructor(config, genome) {
        super(genome)
        this.config = config
        this.featureSourceMap = null
        this.header = null
    }

    async getHeader() {

        if (!this.header) {

            if (!this.featureSourceMap) {
                await this.init()
            }
            // Return the header from the first feature source.  It is assumed that all sources have a common header.
            const firstFS = this.featureSourceMap.values().next().value
            if (firstFS && firstFS.getHeader) {
                this.header = firstFS.getHeader()
            } else {
                this.header = Promise.resolve(undefined)
            }
        }

        return this.header

    }

    async getFeatures({chr, start, end, bpPerPixel, visibilityWindow}) {

        if (!this.featureSourceMap) {
            await this.init()
        }
        const fs = this.featureSourceMap.get(chr)
        if (fs) {
            return fs.getFeatures({chr, start, end, bpPerPixel, visibilityWindow})
        } else {
            return []
        }
    }

    async init() {
        this.featureSourceMap = new Map()

        const options = buildOptions(this.config)
        const data = await igvxhr.loadByteArray(this.config.url, options)
        const dataWrapper = getDataWrapper(data)

        let line
        while ((line = dataWrapper.nextLine()) !== undefined) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('#')) {
                const tokens = trimmed.split(/\s+/)
                if (tokens.length > 1) {
                    const chr = tokens[0]
                    const path = tokens[1]
                    const sourceConfig = Object.assign({}, this.config)
                    sourceConfig.url = path
                    if (path.endsWith(".vcf.gz")) {
                        sourceConfig.format = "vcf"
                        sourceConfig.indexURL = path + ".tbi"
                    }
                    this.featureSourceMap.set(chr, FeatureSource(sourceConfig, this.genome))
                }
            }
        }
    }
}

export default ListFeatureSource

// chrY	https://1000genomes.s3.amazonaws.com/release/20130502/ALL.chrY.phase3_integrated_v1b.20130502.genotypes.vcf.gz
// chrX	https://1000genomes.s3.amazonaws.com/release/20130502/ALL.chrX.phase3_shapeit2_mvncall_integrated_v1b.20130502.genotypes.vcf.gz