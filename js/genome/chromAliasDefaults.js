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

    async preload() {
        // no-op
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

                    if (name === "chrM") {
                        record["ncbi"] = "MT"
                    } else if (name === "MT") {
                        record["ucsc"] = "chrM"
                    } else if (name.toLowerCase().startsWith("chr") && Number.isInteger(Number(name.substring(3)))) {
                        record["ncbi"] = name.substring(3)
                    } else if (Number.isInteger(Number(name))) {
                        record["ucsc"] = "chr" + name
                    }

                    // Special cases for human and mouse
                    if (id.startsWith("hg") || id.startsWith("GRCh") || id === "1kg_ref" || id === "b37") {
                        switch (name) {
                            case "23":
                                record["ucsc"] = "chrX"
                                record["assembly"] = "X"
                                break
                            case "24":
                                record["ucsc"] = "chrY"
                                record["assembly"] = "Y"
                                break
                            case "chrX":
                                record["ncbi"] = "23"
                                record["assembly"] = "X"
                                break
                            case "chrY":
                                record["ncbi"] = "24"
                                record["assembly"] = "Y"
                                break
                            case "X":
                                record["ucsc"] = "chrX"
                                record["ncbi"] = "23"
                                break
                            case "Y":
                                record["ucsc"] = "chrY"
                                record["ncbi"] = "24"
                                break

                        }
                    } else if (id.startsWith("mm") || id.startsWith("GRCm") || id.startsWith("rheMac")) {
                        switch (name) {
                            case "21":
                                record["ucsc"] = "chrX"
                                record["assembly"] = "X"
                                break
                            case "22":
                                record["ucsc"] = "chrY"
                                record["assembly"] = "Y"
                                break
                            case "chrX":
                                record["ncbi"] = "21"
                                record["assembly"] = "X"
                                break
                            case "chrY":
                                record["ncbi"] = "22"
                                record["assembly"] = "Y"
                                break
                            case "X":
                                record["ucsc"] = "chrX"
                                record["ncbi"] = "21"
                                break
                            case "Y":
                                record["ucsc"] = "chrY"
                                record["ncbi"] = "22"
                                break

                        }
                    }
                }
            }


            for (let rec of aliasRecords) {
                ChromAliasDefaults.addCaseAliases(rec)
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

    static addCaseAliases(aliasRecord) {

            // Add some aliases for case insensitivy
            const upper = aliasRecord.chr.toUpperCase()
            const lower = aliasRecord.chr.toLowerCase()
            const cap = aliasRecord.chr.charAt(0).toUpperCase() + aliasRecord.chr.slice(1)
            if(aliasRecord.chr !== upper) {
                aliasRecord["_uppercase"] = upper
            }
            if(aliasRecord.chr !== lower) {
                aliasRecord["_lowercase"] = lower
            }
            if(aliasRecord.chr !== cap) {
                aliasRecord["_cap"] = cap
            }

    }

}

export default ChromAliasDefaults
