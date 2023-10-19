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

    aliasRecordCache = new Map()

    constructor(aliasURL, config, chromosomes) {
        this.aliasURL = aliasURL
        this.config = config
        this.chromosomes = chromosomes
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


    async loadAliases() {
        const data = await igvxhr.loadString(this.aliasURL, buildOptions(this.config))
        const lines = StringUtils.splitLines(data)
        const firstLine = lines[0]
        if (firstLine.startsWith("#")) {
            this.headings = firstLine.split("\t").map(h => h.trim())
            this.altNameSets = this.headings.slice(1)
        }

        for (let line of lines) {
            if (!line.startsWith("#") && line.length > 0) {
                const tokens = line.split("\t")
                const aliasRecord = {chr: tokens[0]}        // TODO -- in IGV alias file format we don't know this
                for (let i = 0; i < tokens.length; i++) {
                    const key = this.headings ? this.headings[i] : i
                    aliasRecord[key] = tokens[i]
                    this.aliasRecordCache.set(tokens[i], aliasRecord)
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
