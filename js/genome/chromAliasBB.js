import BWReader from "../bigwig/bwReader.js"
import ChromAliasDefaults from "./chromAliasDefaults.js"

/**
 * Chromosome alias source backed by a UCSC bigbed file
 *
 *
 * @param aliasURL
 * @param config
 * @returns {Promise<*[]>}
 */

class ChromAliasBB {

    aliasRecordCache = new Map()

    constructor(url, config, genome) {
        config = config || {}
        config.url = url
        this.reader = new BWReader(config, genome)
    }

    async preload(chrNames) {
        await this.reader.preload();
        for(let nm of chrNames) {
            await this.search(nm)
        }
    }

    /**
     * Return the cached canonical chromosome name for the alias.  If none found return the alias.
     *
     * Note this will only work if a "search" for ths chromosome has been performed previously.
     *
     * @param alias
     * @returns {*}
     */
    getChromosomeName(alias) {
        return this.aliasRecordCache.has(alias) ? this.aliasRecordCache.get(alias).chr : alias
    }

    /**
     * Return an alternate chromosome name (alias).  If not exists, return chr
     *
     * Note this will only work if a "search" for ths chromosome has been performed previously.
     *
     * @param chr
     * @param nameSet -- The name set, e.g. "ucsc"
     * @returns {*|undefined}
     */
    getChromosomeAlias(chr, nameSet)
    {
        const aliasRecord =  this.aliasRecordCache.get(chr)
        return aliasRecord ? aliasRecord[nameSet] || chr : chr
    }

    /**
     * Search for chromosome alias bed record.  If found, cache results in the alias -> chr map
     * @param alias
     * @returns {Promise<any>}
     */
    async search(alias) {
        if (!this.aliasRecordCache.has(alias)) {
            const aliasRecord = await this.reader.search(alias)
            if (aliasRecord) {
                ChromAliasDefaults.addCaseAliases(aliasRecord)
                for (let key of Object.keys(aliasRecord)) {
                    if ("start" !== key && "end" !== key) {
                        this.aliasRecordCache.set(aliasRecord[key], aliasRecord)
                    }
                }
            }
        }
        return this.aliasRecordCache.get(alias)
    }

    async getChromosomeNames() {
        await this.reader.loadHeader()
        return Array.from(this.reader.chrNames)
    }

}

export default ChromAliasBB
