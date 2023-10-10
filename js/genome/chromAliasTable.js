/**
 * Represenets a tab-delimited alias file
 *
 * example  - header line is optional but reccomended, required to support altName setting for genome
 * # refseq	assembly	genbank	ncbi	ucsc
 * NC_048407.1	chr01	CM023106.1	1	chr1
 *
 * @param aliasURL
 * @param config
 * @returns {Promise<*[]>}
 */
import {isNumber, buildOptions} from "../util/igvUtils.js"
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"

class ChromAliasTable {

    chrAliasTable

    constructor(aliasURL, config) {
        this.aliasURL = aliasURL
        this.config = config
    }

    /**
     * Initialize the alias table for the canonical chromosome names
     *
     * @param chromosomes - collection of canonical chromosome names (i.e names as used in the fasta or twobit file)
     * @returns {Promise<void>}
     */
    async init(chromosomes) {
        this.createAliasTable(chromosomes)
    }

    async getCanonicalName(alias) {
        return this.chrAliasTable[alias.toLowerCase()]
    }

    async createAliasTable(chromosomes) {

        /**
         * Return the official chromosome name for the (possibly) alias.  Deals with
         * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.
         * @param str
         */
        const chrAliasTable = {}

        // The standard mappings
        chrAliasTable["all"] = "all"
        chromosomes.forEach(function (c) {
            const name = c.name
            if (name.startsWith("chr")) {
                chrAliasTable[name.substring(3)] = name
            } else if (isNumber(name)) {
                chrAliasTable["chr" + name] = name
            }
            if (name === "chrM") chrAliasTable["mt"] = "chrM"
            if (name === "MT") chrAliasTable["chrm"] = "MT"
            chrAliasTable[name.toLowerCase()] = name
        })

        // Custom mappings
        if (this.aliasURL) {
            const aliases = await this.loadAliases()
            for (let array of aliases) {

                // Find the official chr name
                let defName
                for (let i = 0; i < array.length; i++) {
                    if (chromosomes.get(array[i])) {
                        defName = array[i]
                        break
                    }
                }

                if (defName) {
                    for (let alias of array) {
                        if (alias !== defName) {
                            chrAliasTable[alias.toLowerCase()] = defName
                            chrAliasTable[alias] = defName      // Should not be needed
                        }
                    }
                }
            }
        }
        this.chrAliasTable = chrAliasTable
    }

    async loadAliases() {

        const data = await igvxhr.loadString(this.aliasURL, buildOptions(this.config))
        const lines = StringUtils.splitLines(data)
        const firstLine = lines[0]
        if (firstLine.startsWith("#")) {
            const headings = line.split("\t")
            this.canonicalNameSet = headings[0]
            this.altNameSets = headings.slice(1)

        }

        const aliases = []
        for (let line of lines) {
            if (!line.startsWith("#") && line.length > 0) aliases.push(line.split("\t"))
        }
        return aliases
    }
}

export default ChromAliasTable
