/**
 * Represenets a UCSC tab-delimited Alias file
 *
 * example  - header line is optional but reccomended, required to support altName setting for genome
 * # refseq	assembly	genbank	ncbi	ucsc
 * NC_048407.1	chr01	CM023106.1	1	chr1
 *
 * @param aliasURL
 * @param config
 * @returns {Promise<*[]>}
 */
import {buildOptions} from "../util/igvUtils.js"
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import ChromAliasDefaults from "./chromAliasDefaults.js"

class ChromAliasFile {

    aliasRecordCache = new Map()

    constructor(aliasURL, config, genome) {
        this.aliasURL = aliasURL
        this.config = config
        this.genome = genome
    }

    async preload() {
        return this.loadAliases();
    }

    /**
     * Return the canonical chromosome name for the alias.  If none found return the alias
     *
     * @param alias
     * @returns {*}
     */
    getChromosomeName(alias) {
        return this.aliasRecordCache.has(alias) ? this.aliasRecordCache.get(alias).chr : alias
    }

    /**
     * Return an alternate chromosome name (alias).  If not exists, return chr
     * @param chr
     * @param nameSet -- The name set, e.g. "ucsc"
     * @returns {*|undefined}
     */
    getChromosomeAlias(chr, nameSet)
    {
        const aliasRecord =  this.aliasRecordCache.get(chr)
        return aliasRecord ? aliasRecord[nameSet] || chr : chr
    }


    async loadAliases() {

        const data = await igvxhr.loadString(this.aliasURL, buildOptions(this.config))
        const lines = StringUtils.splitLines(data)
        const firstLine = lines[0]
        if (firstLine.startsWith("#")) {
            this.headings = firstLine.substring(1).split("\t").map(h => h.trim())
            this.altNameSets = this.headings.slice(1)
        }

        const chromosomeNameSet = this.genome.chromosomeNames ?
            new Set(this.genome.chromosomeNames) : new Set()

        for (let line of lines) {
            if (!line.startsWith("#") && line.length > 0) {
                const tokens = line.split("\t")

                // Find the canonical chromosome
                let chr = tokens.find(t => chromosomeNameSet.has(t))
                if(!chr) {
                    chr = tokens[0]
                }

                const aliasRecord = {chr}
                ChromAliasDefaults.addCaseAliases(aliasRecord)
                for (let i = 0; i < tokens.length; i++) {
                    const key = this.headings ? this.headings[i] : i
                    aliasRecord[key] = tokens[i]
                }

                for (let a of Object.values(aliasRecord)) {
                    this.aliasRecordCache.set(a, aliasRecord)
                }

            }
        }
    }

    async search(alias) {
        if(this.aliasRecordCache.size === 0) {
            await this.loadAliases()
        }
        return this.aliasRecordCache.get(alias)

    }
}

export default ChromAliasFile
