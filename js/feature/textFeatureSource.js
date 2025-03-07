import {FeatureCache} from "../../node_modules/igv-utils/src/index.js"
import FeatureFileReader from "./featureFileReader.js"
import CustomServiceReader from "./customServiceReader.js"
import UCSCServiceReader from "./ucscServiceReader.js"
import GtexReader from "../qtl/gtexReader.js"
import GenomicInterval from "../genome/genomicInterval.js"
import HtsgetVariantReader from "../htsget/htsgetVariantReader.js"
import {computeWGFeatures, findFeatureAfterCenter, packFeatures} from "./featureUtils.js"
import ChromAliasManager from "./chromAliasManager.js"
import BaseFeatureSource from "./baseFeatureSource.js"
import {summarizeData} from "./wigTrack.js"

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

        const queryableFormats = new Set(["bigwig", "bw", "bigbed", "bb", "biginteract", "biggenepred", "bignarrowpeak", "tdf"])

        this.queryable = config.indexURL || config.queryable === true   // False by default, unless explicitly set
        if (config.reader) {
            // Explicit reader implementation
            this.reader = config.reader
            this.queryable = config.queryable !== false
        } else if (config.sourceType === "ga4gh") {
            throw Error("Unsupported source type 'ga4gh'")
        } else if ((config.type === "eqtl" || config.type === "qtl") && config.sourceType === "gtex-ws") {
            this.reader = new GtexReader(config)
            this.queryable = true
        } else if ("htsget" === config.sourceType) {
            this.reader = new HtsgetVariantReader(config, genome)
            this.queryable = true
        } else if (config.sourceType === 'ucscservice') {
            this.reader = new UCSCServiceReader(config.source)
            this.queryable = true
        } else if (config.sourceType === 'custom') {
            this.reader = new CustomServiceReader(config.source)
            this.queryable = false !== config.source.queryable
        } else if ('service' === config.sourceType) {
            this.reader = new FeatureFileReader(config, genome)
            this.queryable = true
        } else {
            // File of some type (i.e. not a webservice)
            this.reader = new FeatureFileReader(config, genome)
            if (config.queryable !== undefined) {
                this.queryable = config.queryable
            } else if (queryableFormats.has(config.format) || this.reader.indexed) {
                this.queryable = true
            } else {
                // Leav undefined -- will defer until we know if reader has an index
            }
        }

        // Flag indicating if features loaded by this source can be searched for by name or attribute, true by default
        this.searchable = config.searchable !== false

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

        // Various conditions that can require a feature load
        //   * view is "whole genome" but no features are loaded
        //   * cache is disabled
        //   * cache does not contain requested range
        // const containsRange = this.featureCache.containsRange(new GenomicInterval(queryChr, start, end))
        if ((isWholeGenome && !this.wgFeatures && this.supportsWholeGenome()) ||
            this.config.disableCache ||
            !this.featureCache ||
            !this.featureCache.containsRange(new GenomicInterval(chr, start, end))) {
            await this.loadFeatures(chr, start, end, visibilityWindow)
        }

        if (isWholeGenome) {
            if (!this.wgFeatures) {
                if (this.supportsWholeGenome()) {
                    if("wig" === this.config.type) {
                        const allWgFeatures = await computeWGFeatures(this.featureCache.getAllFeatures(), this.genome, 1000000)
                        this.wgFeatures = summarizeData(allWgFeatures, 0, bpPerPixel, windowFunction)
                    } else {
                        this.wgFeatures = await computeWGFeatures(this.featureCache.getAllFeatures(), this.genome, this.maxWGCount)
                    }
                } else {
                    this.wgFeatures = []
                }
            }
            return this.wgFeatures
        } else {
            return this.featureCache.queryFeatures(chr, start, end)
        }
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

            // If track is marked "searchable"< cache features by name -- use this with caution, memory intensive
            if (this.searchable) {
                this.addFeaturesToDB(features, this.config)
            }
        } else {
            this.featureCache = new FeatureCache([], genomicInterval)     // Empty cache
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
