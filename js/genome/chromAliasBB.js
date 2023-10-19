/**
 * Represenets a UCSC bigbed alias file
 *
 *
 * @param aliasURL
 * @param config
 * @returns {Promise<*[]>}
 */
import {isNumber, buildOptions} from "../util/igvUtils.js"
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import BWSource from "../bigwig/bwSource.js"
import BWReader from "../bigwig/bwReader.js"

class ChromAliasBB {

    chrAliasTable = new Map()

    constructor(url, config, genome) {
        config = config || {}
        config.url = url
        this.reader = new BWReader(config, genome)
    }

    /**
     * Return the canonical chromosome name for the alias.  If none found return the alias
     *
     * @param alias
     * @returns {*}
     */
    getChromosomeName(alias) {
        return this.chrAliasTable.has(alias) ? this.chrAliasTable.get(alias).chr : alias
    }

    /**
     * Return an alternate chromosome name (alias).  If not exists, return chr
     * @param chr
     * @param nameSet -- The name set, e.g. "ucsc"
     * @returns {*|undefined}
     */
    getChromosomeAlias(chr, nameSet)
    {
        const aliasRecord =  this.chrAliasTable.get(chr)
        return aliasRecord ? aliasRecord[nameSet] || chr : chr
    }

    /**
     * Search for chromosome alias bed record.
     * @param alias
     * @returns {Promise<any>}
     */
    async search(alias) {
        if (!this.chrAliasTable.has(alias)) {
            const aliasRecord = await this.reader.search(alias)
            if (aliasRecord) {
                for (let key of Object.keys(aliasRecord)) {
                    if ("start" !== key && "end" !== key) {
                        this.chrAliasTable.set(aliasRecord[key], aliasRecord)
                    }
                }
            }
        }
        return this.chrAliasTable.get(alias)
    }

}

export default ChromAliasBB
