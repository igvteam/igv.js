/**
 * Default chromosome aliases, mostly 1<->chr1 etc.  Used if chrom alias file is not supplied.
 *
 */
import {isNumber, buildOptions} from "../util/igvUtils.js"
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"

class ChromAliasDefaults {

    aliasRecordCache = new Map()

    constructor(id, chromosomeNames) {
        this.genomeID = id
        this.update(id, chromosomeNames)
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
     * Return an alternate chromosome name (alias).
     *
     * @param chr
     * @param nameSet -- The name set, e.g. "ucsc"
     * @returns {*|undefined}
     */
    getChromosomeAlias(chr, nameSet) {
        const aliasRecord = this.aliasRecordCache.get(chr)
        return aliasRecord ? aliasRecord[nameSet] || chr : chr
    }

    update(id, chromosomeNames) {

        if (chromosomeNames) {
            const aliasRecords = []
            for (let name of chromosomeNames) {

                if(this.aliasRecordCache.has(name)) {
                    continue;
                }

                let skipRest = false
                const record = {chr: name}
                aliasRecords.push(record)

                if (name.startsWith("gi|")) {
                    // NCBI
                    const alias = ChromAliasDefaults.getNCBIName(name)
                    record["ncbi-gi-versioned"] = alias

                    // Also strip version number out, if present
                    const dotIndex = alias.lastIndexOf('.')
                    if (dotIndex > 0) {
                        const alias = alias.substring(0, dotIndex)
                        record["ncbi-gi"] = alias
                    }
                } else {
                    // Special cases for human and mouse
                    if (id.startsWith("hg") || id.startsWith("GRCh") || id === "1kg_ref" || id === "b37") {
                        switch (name) {
                            case "23":
                                record["ucsc"] = "chrX"
                                skipRest = true
                                break
                            case "24":
                                record["ucsc"] = "chrY"
                                skipRest = true
                                break
                            case "chrX":
                                record["ncbi"] = "23"
                                skipRest = true
                                break
                            case "chrY":
                                record["ncbi"] = "24"
                                skipRest = true
                                break
                        }
                    } else if (id.startsWith("mm") || id.startsWith("GRCm") || id.startsWith("rheMac")) {
                        switch (name) {
                            case "21":
                                record["ucsc"] = "chrX"
                                skipRest = true
                                break
                            case "22":
                                record["ucsc"] = "chrY"
                                skipRest = true
                                break
                            case "chrX":
                                record["ncbi"] = "21"
                                skipRest = true
                                break
                            case "chrY":
                                record["ncbi"] = "22"
                                skipRest = true
                                break
                        }
                    }
                    if (skipRest) continue

                    //
                    if (name === "chrM") {
                        record["ncbi"] = "MT"
                    } else if (name === "MT") {
                        record["ucsc"] = "chrM"
                    } else if (name.toLowerCase().startsWith("chr")) {
                        record["ncbi"] = name.substring(3)
                    } else if (Number.isInteger(Number(name))) {
                        record["ucsc"] = "chr" + name
                    }
                }
            }

            for (let rec of aliasRecords) {
                for (let a of Object.values(rec)) {
                    this.aliasRecordCache.set(a, rec)
                }
            }
        }
    }

    search(alias) {
        return this.aliasRecordCache.get(alias)

    }

    /**
     * Extract the user friendly name from an NCBI accession
     * example: gi|125745044|ref|NC_002229.3|  =>  NC_002229.3
     */
    static getNCBIName(name) {
        const tokens = name.split("\\|")
        return tokens[tokens.length - 1]
    }

}

export default ChromAliasDefaults
