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
import {isNumber, buildOptions} from "../util/igvUtils.js"
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"

class ChromAliasFile {

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

    async loadAliases() {

        const data = await igvxhr.loadString(this.aliasURL, buildOptions(this.config))
        const lines = StringUtils.splitLines(data)
        const firstLine = lines[0]
        if (firstLine.startsWith("#")) {
            this.headings = line.split("\t").map(h => h.trim())
            this.altNameSets = this.headings.slice(1)
        }

        const aliases = []
        for (let line of lines) {
            if (!line.startsWith("#") && line.length > 0) {
                aliases.push(line.split("\t"))
            }
        }
        this. aliases = aliases
    }
}

export default ChromAliasFile
