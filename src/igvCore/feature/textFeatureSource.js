import {FeatureCache} from 'igv-utils'
import FeatureFileReader from "./featureFileReader.js"
import GenomicInterval from "../genome/genomicInterval.js"
import {packFeatures} from "./featureUtils.js"
import ChromAliasManager from "./chromAliasManager.js"
import BaseFeatureSource from "./baseFeatureSource.js"

const DEFAULT_MAX_WG_COUNT = 10000

/**
 * feature source for "bed like" files (tab or whitespace delimited files with 1 feature per line: bed, gff, vcf, etc)
 *
 * @param config
 * @constructor
 */
class TextFeatureSource extends BaseFeatureSource {

    constructor(config, genome) {

        super(genome)

        this.config = config || {}
        this.genome = genome
        this.sourceType = (config.sourceType === undefined ? "file" : config.sourceType)
        this.maxWGCount = config.maxWGCount || DEFAULT_MAX_WG_COUNT
        this.windowFunctions = ["mean", "min", "max", "none"]

        this.queryable = config.indexURL || config.queryable === true   // False by default, unless explicitly set

        this.reader = new FeatureFileReader(config, genome)

    }

    async defaultVisibilityWindow() {
        if (this.reader && typeof this.reader.defaultVisibilityWindow === 'function') {
            return this.reader.defaultVisibilityWindow()
        }
    }

    async trackType() {
        const header = await this.getHeader()
        if (header) {
            return header.type
        } else {
            return undefined    // Convention for unknown or unspecified
        }
    }

    async getHeader() {
        if (!this.header) {

            if (this.reader && typeof this.reader.readHeader === "function") {
                const header = await this.reader.readHeader()
                if (header) {
                    this.header = header
                    if (header.format) {
                        this.config.format = header.format
                    }
                } else {
                    this.header = {}
                }
            } else {
                this.header = {}
            }
        }
        return this.header
    }

    /**
     * Required function for all data source objects.  Fetches features for the
     * range requested.
     *
     * This function is quite complex due to the variety of reader types backing it, some indexed, some queryable,
     * some not.
     *
     * @param chr
     * @param start
     * @param end
     * @param bpPerPixel
     */
    async getFeatures({chr, start, end, bpPerPixel, visibilityWindow, windowFunction}) {

        const isWholeGenome = ("all" === chr.toLowerCase())

        start = start || 0
        end = end || Number.MAX_SAFE_INTEGER

        await this.loadFeatures(chr, start, end, visibilityWindow)

        return this.featureCache.queryFeatures(chr, start, end)
    }

    async findFeatures(fn) {
        return this.featureCache ? this.featureCache.findFeatures(fn) : []
    }

    supportsWholeGenome() {
        return !this.queryable   // queryable (indexed, web services) sources don't support whole genome view
    }

    // TODO -- experimental, will only work for non-indexed sources
    getAllFeatures() {
        if (this.queryable || !this.featureCache) {   // queryable sources don't support all features
            return []
        } else {
            return this.featureCache.getAllFeatures()
        }
    }


    async loadFeatures(chr, start, end, visibilityWindow) {

        await this.getHeader()

        const reader = this.reader
        let intervalStart = start
        let intervalEnd = end

        // chr aliasing
        let queryChr = chr
        if (!this.chrAliasManager && this.reader && this.reader.sequenceNames) {
            this.chrAliasManager = new ChromAliasManager(this.reader.sequenceNames, this.genome)
        }
        if (this.chrAliasManager) {
            queryChr = await this.chrAliasManager.getAliasName(chr)
        }

        // Use visibility window to potentially expand query interval.
        // This can save re-queries as we zoom out.  Visibility window <= 0 is a special case
        // indicating whole chromosome should be read at once.
        if ((!visibilityWindow || visibilityWindow <= 0) && this.config.expandQuery !== false) {
            // Whole chromosome
            const chromosome = this.genome ? this.genome.getChromosome(chr) : undefined
            intervalStart = 0
            intervalEnd = Math.max(chromosome ? chromosome.bpLength : Number.MAX_SAFE_INTEGER, end)
        } else if (visibilityWindow > (end - start) && this.config.expandQuery !== false) {
            let expansionWindow = Math.min(4.1 * (end - start), visibilityWindow)
            if(this.config.minQuerySize && expansionWindow < this.config.minQuerySize) {
                expansionWindow = this.config.minQuerySize
            }
            intervalStart = Math.max(0, (start + end - expansionWindow) / 2)
            intervalEnd = intervalStart + expansionWindow
        }

        let features = await reader.readFeatures(queryChr, intervalStart, intervalEnd)
        if (this.queryable === undefined) {
            this.queryable = reader.indexed
        }

        const genomicInterval = this.queryable ?
            new GenomicInterval(chr, intervalStart, intervalEnd) :
            undefined

        if (features) {

            // Assign overlapping features to rows
            if (this.config.format !== "wig" && this.config.type !== "junctions") {
                const maxRows = this.config.maxRows || Number.MAX_SAFE_INTEGER
                packFeatures(features, maxRows)
            }

            // Note - replacing previous cache with new one.  genomicInterval is optional (might be undefined => includes all features)
            this.featureCache = new FeatureCache(features, this.genome, genomicInterval)

        }
    }

    addFeaturesToDB(featureList, config) {
        if (!this.featureMap) {
            this.featureMap = new Map()
        }
        const searchableFields = config.searchableFields || ["name", "transcript_id", "gene_id", "gene_name", "id"]
        for (let feature of featureList) {
            for (let field of searchableFields) {
                let key
                if(feature.hasOwnProperty(field)) {
                    key = feature[field];
                }
                else if (typeof feature.getAttributeValue === 'function') {
                    key = feature.getAttributeValue(field)
                }
                if (key) {
                    key = key.replaceAll(' ', '+').toUpperCase()
                    // If feature is already present keep largest one
                    if (this.featureMap.has(key)) {
                        const f2 = this.featureMap.get(key)
                        if (feature.end - feature.start < f2.end - f2.start) {
                            continue
                        }
                    }
                    this.featureMap.set(key, feature)
                }
            }
        }
    }

    search(term) {
        if (this.featureMap) {
            return this.featureMap.get(term.toUpperCase())
        }

    }
}

export default TextFeatureSource
