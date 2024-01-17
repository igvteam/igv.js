/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {createVCFVariant} from "./variant.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"

/**
 * Parser for VCF files.
 */

class VcfParser {

    construtor() {
    }

    async parseHeader(dataWrapper, genome) {

        const header = {}

        header.chrAliasTable = new Map()

        // First line must be file format
        let line = await dataWrapper.nextLine()
        if (line.startsWith("##fileformat")) {
            header.version = line.substr(13)
        } else {
            throw new Error("Invalid VCF file: missing fileformat line")
        }

        while ((line = await dataWrapper.nextLine()) !== undefined) {

            if (line.startsWith("#")) {

                let id
                const values = {}

                if (line.startsWith("##")) {

                    if (line.startsWith("##INFO") || line.startsWith("##FILTER") || line.startsWith("##FORMAT")) {

                        const ltIdx = line.indexOf("<")
                        const gtIdx = line.lastIndexOf(">")

                        if (!(ltIdx > 2 && gtIdx > 0)) {
                            console.log("Malformed VCF header line: " + line)
                            continue
                        }

                        const type = line.substring(2, ltIdx - 1)
                        if (!header[type]) header[type] = {}

                        //##INFO=<ID=AF,Number=A,Type=Float,Description="Allele frequency based on Flow Evaluator observation counts">
                        // ##FILTER=<ID=NOCALL,Description="Generic filter. Filtering details stored in FR info tag.">
                        // ##FORMAT=<ID=AF,Number=A,Type=Float,Description="Allele frequency based on Flow Evaluator observation counts">

                        const tokens = StringUtils.splitStringRespectingQuotes(line.substring(ltIdx + 1, gtIdx - 1), ",")

                        for (let token of tokens) {
                            var kv = token.split("=")
                            if (kv.length > 1) {
                                if (kv[0] === "ID") {
                                    id = kv[1]
                                } else {
                                    values[kv[0]] = kv[1]
                                }
                            }
                        }

                        if (id) {
                            header[type][id] = values
                        }
                    } else if (line.startsWith("##contig") && genome) {
                        const idx1 = line.indexOf("<ID=")
                        let idx2 = line.indexOf(",", idx1)
                        if (idx2 == -1) {
                            idx2 = line.indexOf(">", idx1)
                        }
                        const chr = line.substring(idx1 + 4, idx2)
                        const canonicalChromosome = genome.getChromosomeName(chr)
                        header.chrAliasTable.set(canonicalChromosome, chr)
                    } else {
                        // ignoring other directives
                    }
                } else if (line.startsWith("#CHROM")) {
                    const tokens = line.split("\t")

                    if (tokens.length > 8) {

                        // call set names -- use column index for id
                        header.callSets = []
                        for (let j = 9; j < tokens.length; j++) {
                            header.callSets.push({id: j, name: tokens[j]})
                        }
                    }
                }

            } else {
                break
            }

        }

        this.header = header  // Will need to intrepret genotypes and info field

        return header
    }


    /**
     * Parse data as a collection of Variant objects.
     *
     * @param data
     * @returns {Array}
     */
    async parseFeatures(dataWrapper) {

        const allFeatures = []
        const callSets = this.header.callSets
        const nExpectedColumns = 8 + (callSets ? callSets.length + 1 : 0)
        let line
        while ((line = await dataWrapper.nextLine()) !== undefined) {
            if (line && !line.startsWith("#")) {

                const tokens = line.split("\t")
                if (tokens.length === nExpectedColumns) {
                    const variant = createVCFVariant(tokens)
                    variant.header = this.header       // Keep a pointer to the header to interpret fields for popup text
                    //variant.line = line              // Uncomment for debugging
                    allFeatures.push(variant)

                    if (tokens.length > 9) {

                        // Format
                        const callFields = extractCallFields(tokens[8].split(":"))

                        variant.calls = {}
                        for (let index = 9; index < tokens.length; index++) {

                            const token = tokens[index]

                            const callSet = callSets[index - 9]
                            const call = {
                                callSetName: callSet.name,
                                info: {}
                            }

                            variant.calls[callSet.id] = call

                            token.split(":").forEach(function (callToken, idx) {

                                switch (idx) {
                                    case callFields.genotypeIndex:
                                        call.genotype = []
                                        callToken.split(/[\|\/]/).forEach(function (s) {
                                            call.genotype.push('.' === s ? s : parseInt(s))
                                        })
                                        break

                                    default:
                                        call.info[callFields.fields[idx]] = callToken
                                }
                            })
                        }
                    }

                    // If this is a structural variant create a complement of this variant for the other end
                    // The test for "SV" is not comprehensive, there is not yet a standard for this
                    if (variant.info && variant.info.CHR2 && variant.info.END) {
                        allFeatures.push(svComplement(variant))
                    }
                }
            }
        }

        return allFeatures
    }
}

function extractCallFields(tokens) {

    const callFields = {
        genotypeIndex: -1,
        fields: tokens
    }
    for (let i = 0; i < tokens.length; i++) {
        if ("GT" === tokens[i]) {
            callFields.genotypeIndex = i
        }
    }
    return callFields
}

function svComplement(v) {

    const chr2 = v.info.CHR2
    const pos2 = Number.parseInt(v.info.END)
    return {
        chr: chr2,
        start: pos2 - 1,
        end: pos2,
        _f: v
    }

}

export default VcfParser
